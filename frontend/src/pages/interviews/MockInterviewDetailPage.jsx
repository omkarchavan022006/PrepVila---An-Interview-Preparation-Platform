import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, BrainCircuit, CheckCircle2, CircleHelp, Sparkles } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getInterview } from '../../api/interviewsApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { formatInterviewDate, getInterviewError } from './interviewUtils'

function Evaluation({ evaluation }) {
  if (!evaluation) return <p className="mt-3 text-sm text-ink-muted">No evaluation is available for this answer.</p>
  return <div className="mt-4 rounded-card border border-brand-100 bg-brand-50/60 p-4 dark:border-brand-900/70 dark:bg-brand-950/20">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-sm font-semibold text-ink"><Sparkles size={15} className="text-brand-600 dark:text-brand-300" />Evaluation</h4>{typeof evaluation.score === 'number' && <Badge tone="violet">{evaluation.score}/100{evaluation.rating ? ` · ${evaluation.rating}` : ''}</Badge>}</div>
    {evaluation.feedback && <p className="mt-3 text-sm leading-6 text-ink-secondary">{evaluation.feedback}</p>}
    <div className="mt-3 grid gap-4 sm:grid-cols-2">{Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0 && <div><p className="text-xs font-semibold text-ink">Strengths</p><ul className="mt-1.5 grid gap-1.5">{evaluation.strengths.map((value, index) => <li key={`${index}-${value}`} className="flex gap-2 text-sm leading-5 text-ink-muted"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />{value}</li>)}</ul></div>}{Array.isArray(evaluation.improvements) && evaluation.improvements.length > 0 && <div><p className="text-xs font-semibold text-ink">Areas to improve</p><ul className="mt-1.5 grid gap-1.5">{evaluation.improvements.map((value, index) => <li key={`${index}-${value}`} className="text-sm leading-5 text-ink-muted">{value}</li>)}</ul></div>}</div>
    {evaluation.ideal_answer && <details className="mt-3 rounded-control border border-border-soft bg-surface px-3 py-2.5"><summary className="cursor-pointer text-xs font-semibold text-ink">View improved answer</summary><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{evaluation.ideal_answer}</p></details>}
  </div>
}

export default function MockInterviewDetailPage() {
  const { interviewId } = useParams()
  const location = useLocation()
  const completion = location.state?.completion
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadInterview = useCallback(async () => {
    try { const { data } = await getInterview(interviewId); setInterview(data); setError('') }
    catch (requestError) { setError(getInterviewError(requestError)) }
    finally { setLoading(false) }
  }, [interviewId])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void loadInterview() }); return () => { active = false } }, [loadInterview])
  if (loading) return <div className="grid gap-4"><LoadingSkeleton className="h-20" /><Card><LoadingSkeleton className="h-6 w-1/2" /><LoadingSkeleton className="mt-5 h-32 w-full" /></Card></div>
  if (error) return <Card><ErrorState title="Interview details unavailable" message={error} onRetry={loadInterview} /></Card>
  if (!interview) return null
  const questions = Array.isArray(interview.questions) ? interview.questions : []
  return <div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Button as={Link} to="/dashboard/interviews/history" variant="ghost" size="sm"><ArrowLeft size={15} />Back to history</Button><Badge tone={interview.status === 'completed' ? 'success' : 'info'}>{interview.status}</Badge></div>
    <header className="mb-6"><p className="text-sm font-medium text-brand-700 dark:text-brand-300">{interview.difficulty} difficulty · {questions.length} questions</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink">{interview.job_title || 'Mock interview results'}</h1><p className="mt-2 text-sm text-ink-muted">Started {formatInterviewDate(interview.created_at)}{interview.completed_at ? ` · Completed ${formatInterviewDate(interview.completed_at)}` : ''}</p></header>
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-xs text-ink-muted">Session status</p><p className="mt-1 font-semibold capitalize text-ink">{interview.status}</p></Card><Card className="p-4"><p className="text-xs text-ink-muted">Questions</p><p className="mt-1 font-semibold text-ink">{questions.length} / {interview.total_questions}</p></Card><Card className="p-4"><p className="text-xs text-ink-muted">Overall score</p><p className="mt-1 font-semibold text-ink">{typeof completion?.total_score === 'number' ? `${completion.total_score}/100` : typeof interview.total_score === 'number' ? `${interview.total_score}/100` : 'Not available'}</p></Card></div>
    {Array.isArray(completion?.question_scores) && <Card className="mb-5 p-5"><h2 className="font-semibold text-ink">Question scores</h2><div className="mt-3 flex flex-wrap gap-2">{completion.question_scores.map((score, index) => <Badge key={`${index}-${score}`} tone="violet">Q{index + 1}: {score}</Badge>)}</div></Card>}
    <div className="grid gap-4">{questions.map((item, index) => <Card key={`${interview.interview_id}-question-${index}`} className="p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200"><CircleHelp size={18} /></span><div><p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Question {index + 1}{item.topic ? ` · ${item.topic}` : ''}</p><h2 className="mt-2 whitespace-pre-wrap font-semibold leading-7 text-ink">{item.question}</h2></div></div>{item.user_answer && <div className="mt-4 rounded-control border border-border-soft bg-surface-muted/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Your answer</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{item.user_answer}</p></div>}<Evaluation evaluation={item.evaluation} />{item.explanation && <details className="mt-4"><summary className="cursor-pointer text-sm font-medium text-ink-muted">What this question evaluates</summary><p className="mt-2 text-sm leading-6 text-ink-muted">{item.explanation}</p></details>}</Card>)}</div>
    {questions.length === 0 && <Card><div className="py-8 text-center"><BrainCircuit className="mx-auto text-ink-subtle" size={30} /><p className="mt-3 text-sm text-ink-muted">No question details were returned for this session.</p></div></Card>}
    {interview.status === 'in_progress' && <div className="mt-5 flex justify-end"><Button as={Link} to={`/dashboard/interviews/session/${encodeURIComponent(interview.interview_id)}`}>Resume interview</Button></div>}
  </div>
}
