import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, ClipboardCheck, FileBarChart2, History, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getInterviewHistory } from '../../api/interviewsApi'
import { generateInterviewFeedback, getInterviewFeedbackHistory } from '../../api/interviewFeedbackApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { formatFeedbackDate, getFeedbackError, isUncertainFeedbackRequest } from './feedbackUtils'

export default function InterviewFeedbackPage() {
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [reports, setReports] = useState([])
  const [interviewId, setInterviewId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [formError, setFormError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [pendingBaselineIds, setPendingBaselineIds] = useState([])

  const loadOptions = useCallback(async () => {
    try {
      const [interviewResponse, reportResponse] = await Promise.all([getInterviewHistory(), getInterviewFeedbackHistory()])
      setInterviews(Array.isArray(interviewResponse.data?.history) ? interviewResponse.data.history.filter((item) => item.status === 'completed') : [])
      setReports(Array.isArray(reportResponse.data?.history) ? reportResponse.data.history : [])
      setLoadError('')
    } catch (error) {
      setLoadError(getFeedbackError(error))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void loadOptions() }); return () => { active = false } }, [loadOptions])

  const selectedInterview = useMemo(() => interviews.find((item) => String(item.interview_id) === String(interviewId)), [interviews, interviewId])
  const existingReport = reports.find((item) => String(item.interview_id) === String(interviewId))

  async function resolveUncertainStart() {
    setGenerating(true)
    setFormError('Checking whether the report was saved…')
    try {
      const { data } = await getInterviewFeedbackHistory()
      const matches = (Array.isArray(data?.history) ? data.history : []).filter((item) => String(item.interview_id) === String(interviewId) && !pendingBaselineIds.includes(String(item.feedback_id)))
      if (matches.length === 1) {
        toast.success('The report was saved. Opening it now.')
        navigate(`/dashboard/feedback/${encodeURIComponent(matches[0].feedback_id)}`)
        return
      }
      setFormError(matches.length > 1
        ? 'More than one new saved report matches this interview. Open report history and choose the correct saved report; do not generate again.'
        : 'No new saved report is visible yet. The request may still be completing. Check report history again before retrying.')
      setUncertain(true)
    } catch (error) {
      setFormError(getFeedbackError(error))
      setUncertain(true)
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerate(event) {
    event.preventDefault()
    if (!selectedInterview || generating || uncertain || existingReport) return
    setGenerating(true)
    setFormError('')
    try {
      const { data: before } = await getInterviewFeedbackHistory()
      const baseline = Array.isArray(before?.history) ? before.history : []
      const baselineIds = baseline.map((item) => String(item.feedback_id))
      try {
        const { data } = await generateInterviewFeedback(selectedInterview.interview_id)
        if (!data?.feedback_id) throw new Error('The report response did not contain a report ID.')
        toast.success(data.message || 'Interview feedback report generated.')
        navigate(`/dashboard/feedback/${encodeURIComponent(data.feedback_id)}`, { state: { generatedReport: data } })
      } catch (error) {
        if (isUncertainFeedbackRequest(error)) {
          setPendingBaselineIds(baselineIds)
          setUncertain(true)
          setFormError('The response was lost, so the report may have been saved. Check report history before retrying.')
        } else {
          setFormError(getFeedbackError(error, true))
          toast.error(getFeedbackError(error, true))
        }
      }
    } catch (error) {
      setFormError(getFeedbackError(error))
      toast.error(getFeedbackError(error))
    } finally {
      setGenerating(false)
    }
  }

  return <div>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9"><div><Badge tone="violet"><Sparkles size={13} className="mr-1" />AI performance review</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Interview feedback</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">Generate a detailed report from a completed mock interview and review your saved feedback.</p></div><Button as={Link} to="/dashboard/feedback/history" variant="outline"><History size={16} />Report history</Button></header>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <Card className="p-5 sm:p-7"><div className="mb-5 flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-blue-100 text-brand-700 dark:from-brand-900/60 dark:to-blue-950 dark:text-brand-200"><FileBarChart2 size={21} /></span><div><h2 className="text-lg font-semibold text-ink">Create a feedback report</h2><p className="mt-1 text-sm leading-6 text-ink-muted">The backend accepts completed interviews with saved answers and evaluations.</p></div></div>
        {loadError ? <ErrorState title="Interview choices unavailable" message={loadError} onRetry={loadOptions} /> : loading ? <div className="grid gap-4"><LoadingSkeleton className="h-12" /><LoadingSkeleton className="h-12" /><LoadingSkeleton className="h-12" /></div> : interviews.length === 0 ? <EmptyState title="No completed interviews yet" description="Complete a mock interview before generating its feedback report." icon={ClipboardCheck} action={<Button as={Link} to="/dashboard/interviews">Go to mock interviews</Button>} /> : <form onSubmit={handleGenerate} className="grid gap-4">
          <div className="grid gap-2"><label htmlFor="feedback-interview" className="text-sm font-semibold text-ink-secondary">Completed interview</label><select id="feedback-interview" value={interviewId} onChange={(event) => { setInterviewId(event.target.value); setFormError(''); setUncertain(false) }} disabled={generating || uncertain} className="min-h-12 w-full rounded-control border border-border-strong/80 bg-surface px-4 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="">Select an interview</option>{interviews.map((item) => <option key={item.interview_id} value={item.interview_id}>{item.job_title || 'Mock interview'} · {formatFeedbackDate(item.completed_at || item.created_at)}</option>)}</select></div>
          {existingReport && <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100"><span>A saved report for this interview is in recent history.</span><Button as={Link} to={`/dashboard/feedback/${encodeURIComponent(existingReport.feedback_id)}`} variant="outline" size="sm">View report<ArrowRight size={14} /></Button></div>}
          {formError && <div role="status" className="rounded-control border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{formError}{uncertain && <div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={generating} onClick={resolveUncertainStart}>Check report history</Button><Button as={Link} to="/dashboard/feedback/history" variant="ghost" size="sm">Open report history</Button></div>}</div>}
          <div className="flex flex-wrap justify-end gap-2"><Button type="submit" loading={generating} disabled={!selectedInterview || Boolean(existingReport) || uncertain}><Sparkles size={15} />Generate feedback</Button></div>
        </form>}
      </Card>
      <Card className="relative overflow-hidden p-5 sm:p-7"><div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-800/20" /><div className="relative"><Badge>Report contents</Badge><h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">Built from your saved interview.</h2><p className="mt-2 text-sm leading-6 text-ink-muted">The report service analyzes the answers and per-question evaluations already stored for your completed session.</p><ul className="mt-5 grid gap-3">{['Overall summary and rating', 'Strengths and weaknesses', 'Topic-wise performance', 'Prioritized improvement plan', 'Actionable recommendations'].map((label) => <li key={label} className="flex items-center gap-2 text-sm text-ink-secondary"><span className="size-1.5 rounded-full bg-brand-500" />{label}</li>)}</ul><p className="mt-5 text-xs leading-5 text-ink-subtle">These sections are shown only when returned in the saved report.</p></div></Card>
    </div>
  </div>
}
