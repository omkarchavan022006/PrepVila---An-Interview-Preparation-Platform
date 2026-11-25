import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, BrainCircuit, Clock3, History, Play, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { getJobs } from '../../api/jobsApi'
import { getResumes } from '../../api/resumeApi'
import { getInterviewHistory, startInterview } from '../../api/interviewsApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import Input from '../../components/common/Input'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { getInterviewError, isUncertainRequest } from './interviewUtils'

export default function MockInterviewPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [resumes, setResumes] = useState([])
  const [loadingChoices, setLoadingChoices] = useState(true)
  const [choicesError, setChoicesError] = useState('')
  const [jobId, setJobId] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [totalQuestions, setTotalQuestions] = useState('5')
  const [starting, setStarting] = useState(false)
  const [formError, setFormError] = useState('')
  const [startUncertain, setStartUncertain] = useState(false)

  const loadChoices = useCallback(async () => {
    try {
      const [jobResponse, resumeResponse] = await Promise.all([getJobs({ page: 1, limit: 100 }), getResumes()])
      setJobs(Array.isArray(jobResponse.data?.items) ? jobResponse.data.items : [])
      setResumes(Array.isArray(resumeResponse.data?.resumes) ? resumeResponse.data.resumes : [])
      setChoicesError('')
    } catch (error) {
      setChoicesError(getInterviewError(error))
    } finally {
      setLoadingChoices(false)
    }
    }, [])

  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void loadChoices() }); return () => { active = false } }, [loadChoices])

  async function handleStart(event) {
    event.preventDefault()
    const count = Number(totalQuestions)
    if (!jobId) { setFormError('Select a job role to start.'); return }
    if (!Number.isInteger(count) || count < 1 || count > 20) { setFormError('Choose between 1 and 20 questions.'); return }
    setStarting(true)
    setFormError('')
    setStartUncertain(false)
    const payload = { job_id: jobId, difficulty, total_questions: count }
    if (resumeId) payload.resume_id = resumeId
    const selectedJob = jobs.find((job) => String(job.id) === String(jobId))
    let previousIds = new Set()
    let requestStartedAt = Date.now()
    let startRequestSent = false
    try {
      const { data: before } = await getInterviewHistory()
      previousIds = new Set((Array.isArray(before?.history) ? before.history : []).map((item) => String(item.interview_id)))
      requestStartedAt = Date.now()
      startRequestSent = true
      const { data } = await startInterview(payload)
      if (!data?.interview_id || !data?.question?.question) throw new Error('The server response did not include the started interview details.')
      toast.success(data.message || 'Your interview is ready.')
      navigate(`/dashboard/interviews/session/${encodeURIComponent(data.interview_id)}`)
    } catch (error) {
      if (startRequestSent && isUncertainRequest(error)) {
        try {
          const { data } = await getInterviewHistory()
          const candidates = (Array.isArray(data?.history) ? data.history : []).filter((item) => {
            const created = Date.parse(item.created_at)
            return !previousIds.has(String(item.interview_id)) && item.job_title === selectedJob?.title && item.difficulty === difficulty && Number(item.total_questions) === count && item.status === 'in_progress' && Number(item.current_question_number) === 1 && Number.isFinite(created) && created >= requestStartedAt - 5000
          })
          if (candidates.length === 1) {
            toast.success('Your interview session was created. Opening it now.')
            navigate(`/dashboard/interviews/session/${encodeURIComponent(candidates[0].interview_id)}`)
            return
          }
        } catch {
          // The user can still inspect the supported history page to resolve an ambiguous start.
        }
        setStartUncertain(true)
        setFormError('We could not confirm whether the session started. Check interview history before starting another session.')
        toast.error('Session start could not be confirmed. Check your history before retrying.')
        return
      }
      const message = getInterviewError(error)
      setFormError(message)
      toast.error(message)
    } finally {
      setStarting(false)
    }
  }

  return <div>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
      <div><Badge tone="violet"><BrainCircuit size={13} className="mr-1" />AI practice studio</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Mock interviews</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">Practice role-specific questions, submit each answer, and review the feedback returned for your session.</p></div>
      <Link to="/dashboard/interviews/history" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-transparent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/70 dark:hover:bg-brand-900/30"><History size={16} />Interview history</Link>
    </header>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
      <Card className="p-5 sm:p-7">
        <div className="mb-6 flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-blue-100 text-brand-700 dark:from-brand-900/60 dark:to-blue-950 dark:text-brand-200"><Sparkles size={21} /></span><div><h2 className="text-lg font-semibold text-ink">Set up a practice session</h2><p className="mt-1 text-sm text-ink-muted">Choose a role, difficulty, and question count.</p></div></div>
        {choicesError ? <ErrorState title="Setup options unavailable" message={choicesError} onRetry={loadChoices} /> : loadingChoices ? <div className="grid gap-4"><LoadingSkeleton className="h-12" /><LoadingSkeleton className="h-12" /><LoadingSkeleton className="h-12" /><LoadingSkeleton className="h-12" /></div> : jobs.length === 0 ? <EmptyState title="No job roles available" description="Add or select an available role in Job Roles before starting an interview." action={<Link to="/dashboard/jobs" className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-strong px-4 py-2 text-sm font-semibold text-ink hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/70 dark:hover:bg-brand-900/30">Browse job roles</Link>} /> : <form onSubmit={handleStart} className="grid gap-5">
          <div className="grid gap-2"><label htmlFor="interview-job" className="text-sm font-semibold text-ink-secondary">Job role</label><select id="interview-job" value={jobId} onChange={(event) => { setJobId(event.target.value); setFormError('') }} className="min-h-12 w-full rounded-control border border-border-strong/80 bg-surface px-4 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="">Select a job role</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></div>
          <div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><label htmlFor="interview-difficulty" className="text-sm font-semibold text-ink-secondary">Difficulty</label><select id="interview-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="min-h-12 rounded-control border border-border-strong/80 bg-surface px-4 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div><Input label="Number of questions" type="number" min="1" max="20" step="1" value={totalQuestions} onChange={(event) => setTotalQuestions(event.target.value)} hint="Choose from 1 to 20." /></div>
          <div className="grid gap-2"><label htmlFor="interview-resume" className="text-sm font-semibold text-ink-secondary">Resume <span className="font-normal text-ink-muted">(optional)</span></label><select id="interview-resume" value={resumeId} onChange={(event) => setResumeId(event.target.value)} className="min-h-12 rounded-control border border-border-strong/80 bg-surface px-4 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="">Continue without a resume</option>{resumes.filter((resume) => resume.analysis_status === 'completed').map((resume) => <option key={resume.id} value={resume.id}>{resume.filename || 'Resume'}</option>)}</select><p className="text-xs text-ink-muted">Only completed resume analyses are accepted by the interview service.</p></div>
          {formError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"><span>{formError}</span>{startUncertain && <Button as={Link} to="/dashboard/interviews/history" variant="outline" size="sm">Open history</Button>}</div>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-5"><span className="flex items-center gap-2 text-xs text-ink-muted"><Clock3 size={15} />One question at a time</span><Button type="submit" loading={starting} disabled={startUncertain}><Play size={16} />Start interview<ArrowRight size={15} /></Button></div>
        </form>}
      </Card>
      <Card className="relative overflow-hidden p-5 sm:p-7"><div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 size-48 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-800/20" /><div className="relative"><Badge>Session flow</Badge><h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">Answer at your own pace.</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Each response is evaluated before the next question is generated. Your session and returned feedback remain available in history.</p><ol className="mt-6 grid gap-4">{['Get a role-specific question', 'Write and submit your answer', 'Review feedback and continue'].map((step, index) => <li key={step} className="flex items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full border border-brand-200 bg-brand-50 text-xs font-bold text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-200">{index + 1}</span><span className="text-sm font-medium text-ink-secondary">{step}</span></li>)}</ol></div></Card>
    </div>
  </div>
}
