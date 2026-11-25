import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, BrainCircuit, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getInterviewHistory } from '../../api/interviewsApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { formatInterviewDate, getInterviewError } from './interviewUtils'

export default function MockInterviewHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadHistory = useCallback(async () => {
    try {
      const { data } = await getInterviewHistory()
      setHistory(Array.isArray(data?.history) ? data.history : [])
      setError('')
    } catch (requestError) { setError(getInterviewError(requestError)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void loadHistory() }); return () => { active = false } }, [loadHistory])

  return <div>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><Badge tone="violet"><History size={13} className="mr-1" />Your practice</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Interview history</h1><p className="mt-2 text-sm text-ink-muted">Review previous interview sessions and their status.</p></div><Button as={Link} to="/dashboard/interviews" variant="outline"><BrainCircuit size={16} />New interview</Button></header>
    {error ? <Card><ErrorState title="Interview history unavailable" message={error} onRetry={loadHistory} /></Card> : loading ? <div className="grid gap-3">{[0, 1, 2].map((item) => <Card key={item} className="p-5"><LoadingSkeleton className="h-5 w-56" /><LoadingSkeleton className="mt-4 h-4 w-40" /></Card>)}</div> : history.length === 0 ? <Card><EmptyState title="No interviews yet" description="Your completed and in-progress practice sessions will appear here." icon={BrainCircuit} action={<Button as={Link} to="/dashboard/interviews">Start your first interview</Button>} /></Card> : <div className="grid gap-3">{history.map((item) => <Card key={item.interview_id} as="article" className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><BrainCircuit size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ink">{item.job_title || 'Mock interview'}</h2><Badge tone={item.status === 'completed' ? 'success' : 'info'}>{item.status}</Badge><Badge>{item.difficulty}</Badge></div><p className="mt-1.5 text-xs text-ink-muted">Started {formatInterviewDate(item.created_at)} · {item.current_question_number} of {item.total_questions} questions</p></div><div className="flex items-center justify-between gap-4 sm:justify-end"><div className="text-right">{item.status === 'completed' && typeof item.total_score === 'number' ? <><p className="text-lg font-bold text-ink">{item.total_score}<span className="text-xs font-medium text-ink-muted">/100</span></p><p className="text-xs text-ink-muted">Overall score</p></> : <p className="text-xs text-ink-muted">In progress</p>}</div><Button as={Link} to={item.status === 'in_progress' ? `/dashboard/interviews/session/${encodeURIComponent(item.interview_id)}` : `/dashboard/interviews/${encodeURIComponent(item.interview_id)}`} variant="outline" size="sm">{item.status === 'in_progress' ? 'Resume' : 'Review'}<ArrowRight size={14} /></Button></div></div></Card>)}</div>}
  </div>
}
