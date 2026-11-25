import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clipboard, FileBarChart2, Lightbulb, Sparkles, Target, TriangleAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { getInterviewFeedback } from '../../api/interviewFeedbackApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { formatFeedbackDate, getFeedbackError } from './feedbackUtils'

function ReportList({ title, values, icon: Icon = CheckCircle2, tone = 'brand' }) {
  const safeValues = Array.isArray(values) ? values.filter((item) => typeof item === 'string' && item.trim()) : []
  if (safeValues.length === 0) return null
  const iconTone = tone === 'amber' ? 'text-amber-600 dark:text-amber-300' : 'text-brand-600 dark:text-brand-300'
  return <Card className="p-5 sm:p-6"><h2 className="flex items-center gap-2 font-semibold text-ink"><Icon size={17} className={iconTone} />{title}</h2><ul className="mt-4 grid gap-3">{safeValues.map((item, index) => <li key={`${index}-${item}`} className="flex items-start gap-2.5 text-sm leading-6 text-ink-secondary"><span className={`mt-2 size-1.5 shrink-0 rounded-full ${tone === 'amber' ? 'bg-amber-500' : 'bg-brand-500'}`} />{item}</li>)}</ul></Card>
}

function ReportTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-control border border-border-soft bg-surface px-3 py-2 shadow-float"><p className="text-xs text-ink-muted">{label}</p><p className="mt-1 text-sm font-semibold text-ink">Score: {payload[0].value}</p></div>
}

function buildReportText(report) {
  const result = report?.result || {}
  const lines = [typeof report?.job_title === 'string' ? report.job_title : '', typeof result.overall_rating === 'string' ? result.overall_rating : '', typeof result.overall_score === 'number' ? `Overall score: ${result.overall_score}` : '', typeof result.overall_summary === 'string' ? result.overall_summary : '']
  for (const field of ['strengths', 'weaknesses', 'recommendations']) {
    const entries = Array.isArray(result[field]) ? result[field].filter((item) => typeof item === 'string' && item.trim()) : []
    if (entries.length) lines.push(`${field.replaceAll('_', ' ')}:\n${entries.map((item) => `• ${item}`).join('\n')}`)
  }
  if (Array.isArray(result.topic_wise_performance) && result.topic_wise_performance.length) lines.push(`Topic-wise performance:\n${result.topic_wise_performance.filter((item) => item && typeof item.topic === 'string').map((item) => [item.topic, typeof item.score === 'number' ? `Score ${item.score}` : '', typeof item.rating === 'string' ? item.rating : '', typeof item.feedback === 'string' ? item.feedback : ''].filter(Boolean).join(' — ')).join('\n')}`)
  const plan = Array.isArray(result.improvement_plan) ? result.improvement_plan.filter((item) => item && typeof item === 'object').map((item) => [item.priority, item.area, item.action].filter((value) => typeof value === 'string' && value.trim()).join(' — ')).filter(Boolean) : []
  if (plan.length) lines.push(`Improvement plan:\n${plan.join('\n')}`)
  return lines.filter(Boolean).join('\n\n')
}

export default function FeedbackDetailPage() {
  const { feedbackId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadReport = useCallback(async () => {
    try {
      const { data } = await getInterviewFeedback(feedbackId)
      setReport(data)
      setError('')
    } catch (requestError) { setError(getFeedbackError(requestError)) }
    finally { setLoading(false) }
  }, [feedbackId])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void loadReport() }); return () => { active = false } }, [loadReport])

  const result = report?.result && typeof report.result === 'object' ? report.result : {}
  const topics = useMemo(() => Array.isArray(result.topic_wise_performance) ? result.topic_wise_performance.filter((item) => item && typeof item === 'object' && typeof item.topic === 'string' && typeof item.score === 'number') : [], [result.topic_wise_performance])
  const improvementItems = Array.isArray(result.improvement_plan) ? result.improvement_plan.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) : []
  const score = typeof result.overall_score === 'number' ? result.overall_score : typeof report?.overall_score === 'number' ? report.overall_score : null
  const rating = typeof result.overall_rating === 'string' ? result.overall_rating : typeof report?.overall_rating === 'string' ? report.overall_rating : ''

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(buildReportText(report))
      toast.success('Feedback report copied.')
    } catch { toast.error('Could not access the clipboard. You can select and copy the report text instead.') }
  }

  if (loading) return <div className="grid gap-4"><LoadingSkeleton className="h-20" /><Card><LoadingSkeleton className="h-7 w-2/3" /><LoadingSkeleton className="mt-5 h-24 w-full" /></Card><Card><LoadingSkeleton className="h-56 w-full" /></Card></div>
  if (error) return <Card><ErrorState title="Feedback report unavailable" message={error} onRetry={loadReport} /></Card>
  if (!report) return null
  const hasReportContent = Boolean((typeof result.overall_summary === 'string' && result.overall_summary) || rating || score !== null || (Array.isArray(result.strengths) && result.strengths.some((item) => typeof item === 'string')) || (Array.isArray(result.weaknesses) && result.weaknesses.some((item) => typeof item === 'string')) || topics.length || improvementItems.length || (Array.isArray(result.recommendations) && result.recommendations.some((item) => typeof item === 'string')))

  return <div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link to="/dashboard/feedback/history" className="inline-flex min-h-9 items-center gap-2 rounded-control px-3 py-2 text-xs font-semibold text-ink-secondary hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/70"><ArrowLeft size={15} />Back to reports</Link><Button variant="outline" size="sm" onClick={copyReport} disabled={!hasReportContent}><Clipboard size={15} />Copy report</Button></div>
    <header className="mb-6"><Badge tone="violet"><Sparkles size={12} className="mr-1" />AI feedback report</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{report.job_title || 'Interview performance report'}</h1><p className="mt-2 text-sm text-ink-muted">Generated {formatFeedbackDate(report.created_at)}</p></header>
    {!hasReportContent ? <Card><EmptyState title="This report has no detailed feedback" description="The saved record did not return report sections to display." icon={FileBarChart2} /></Card> : <>
      <section aria-label="Report summary" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(score !== null || rating) && <Card className="flex items-center gap-4 p-5"><div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-blue-100 text-brand-700 dark:from-brand-900/60 dark:to-blue-950 dark:text-brand-200"><Target size={23} /></div><div className="min-w-0"><p className="text-xs font-medium text-ink-muted">Overall performance</p>{score !== null && <p className="mt-0.5 font-display text-2xl font-bold text-ink">{score}<span className="text-sm font-medium text-ink-muted">/100</span></p>}{rating && <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{rating}</p>}</div></Card>}
        {report.interview_id && <Card className="flex items-center justify-between gap-3 p-5"><div><p className="text-xs font-medium text-ink-muted">Source interview</p><p className="mt-1 text-sm font-semibold text-ink">Open session details</p></div><Button as={Link} to={`/dashboard/interviews/${encodeURIComponent(report.interview_id)}`} variant="outline" size="sm">View interview<ArrowLeft size={14} className="rotate-180" /></Button></Card>}
      </section>
      {typeof result.overall_summary === 'string' && result.overall_summary && <Card className="mb-5 border-brand-200/80 bg-gradient-to-br from-brand-50/70 to-surface p-5 dark:from-brand-950/30 dark:to-surface sm:p-7"><h2 className="font-semibold text-ink">Overall summary</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-secondary">{result.overall_summary}</p>{score !== null && <div className="mt-5"><div className="mb-1.5 flex justify-between text-xs text-ink-muted"><span>Overall score</span><span>{score}/100</span></div><div role="progressbar" aria-label="Overall score" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.max(0, Math.min(score, 100))} className="h-2 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-950"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-blue-500" style={{ width: `${Math.max(0, Math.min(score, 100))}%` }} /></div></div>}</Card>}
      {topics.length > 0 && <Card className="mb-5 min-w-0 p-0"><div className="border-b border-border-soft px-5 py-4 sm:px-6"><h2 className="font-semibold text-ink">Topic-wise performance</h2><p className="mt-1 text-sm text-ink-muted">Scores returned for the topics covered in your interview.</p></div><div className="h-72 px-2 pb-4 pt-5 sm:px-5" role="img" aria-label="Bar chart of feedback scores by topic"><ResponsiveContainer width="100%" height="100%"><BarChart data={topics} margin={{ top: 8, right: 12, bottom: 8, left: -16 }}><CartesianGrid stroke="var(--border-soft)" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="topic" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} interval={0} angle={-16} textAnchor="end" height={58} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} /><Tooltip content={<ReportTooltip />} /><Bar dataKey="score" name="Score" fill="#8055e8" radius={[6, 6, 0, 0]} maxBarSize={50} /></BarChart></ResponsiveContainer></div><div className="grid gap-2 border-t border-border-soft p-4 sm:grid-cols-2">{topics.map((topic, index) => <details key={`${index}-${topic.topic}`} className="rounded-control border border-border-soft bg-surface-muted/40 px-3 py-2"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-ink"><span className="truncate">{topic.topic}</span><span className="shrink-0 text-xs text-ink-muted">{topic.score}{typeof topic.rating === 'string' && topic.rating ? ` · ${topic.rating}` : ''}</span></summary>{typeof topic.feedback === 'string' && topic.feedback && <p className="mt-2 text-sm leading-6 text-ink-muted">{topic.feedback}</p>}</details>)}</div></Card>}
      <div className="grid gap-4 lg:grid-cols-2"><ReportList title="Strengths" values={result.strengths} /><ReportList title="Areas to improve" values={result.weaknesses} icon={TriangleAlert} tone="amber" /></div>
      {improvementItems.length > 0 && <Card className="mt-4 p-5 sm:p-6"><h2 className="flex items-center gap-2 font-semibold text-ink"><Target size={17} className="text-brand-600 dark:text-brand-300" />Improvement plan</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{improvementItems.map((item, index) => <article key={`${index}-${typeof item.area === 'string' ? item.area : 'plan'}`} className="rounded-card border border-border-soft bg-surface-muted/35 p-4"><div className="flex flex-wrap items-center justify-between gap-2">{typeof item.area === 'string' && item.area && <h3 className="text-sm font-semibold text-ink">{item.area}</h3>}{typeof item.priority === 'string' && item.priority && <Badge tone={item.priority.toLowerCase() === 'high' ? 'warning' : 'neutral'}>{item.priority} priority</Badge>}</div>{typeof item.action === 'string' && item.action && <p className="mt-2 text-sm leading-6 text-ink-muted">{item.action}</p>}</article>)}</div></Card>}
      <ReportList title="Recommendations" values={result.recommendations} icon={Lightbulb} />
    </>}
  </div>
}
