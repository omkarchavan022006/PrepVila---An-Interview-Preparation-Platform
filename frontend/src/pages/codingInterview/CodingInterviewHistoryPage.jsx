import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Braces } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCodingInterviewHistory } from '../../api/codingInterviewApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { apiError, formatCodeDate } from './codingInterviewUtils'

export default function CodingInterviewHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { const { data } = await getCodingInterviewHistory(); setHistory(Array.isArray(data?.history) ? data.history : []); setError('') }
    catch (requestError) { setError(apiError(requestError)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load() }); return () => { active = false } }, [load])
  return <div>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Button as={Link} to="/dashboard/coding-interview" variant="ghost" size="sm"><ArrowLeft size={15} />Coding Interview</Button><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">Submission history</h1><p className="mt-2 text-sm text-ink-muted">Saved coding submissions and their returned AI evaluations.</p></div><Button as={Link} to="/dashboard/coding-interview">New question</Button></header>
    {error ? <Card><ErrorState title="Submission history unavailable" message={error} onRetry={load} /></Card> : loading ? <div className="grid gap-3">{[0, 1, 2].map((item) => <Card key={item}><LoadingSkeleton className="h-5 w-48" /><LoadingSkeleton className="mt-4 h-4 w-64" /></Card>)}</div> : history.length ? <div className="grid gap-3">{history.map((item) => <Card key={item.submission_id} as="article" className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200"><Braces size={20} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ink">Coding submission</h2><Badge>{item.programming_language || 'Language unavailable'}</Badge>{typeof item.evaluation?.verdict === 'string' && <Badge tone="violet">{item.evaluation.verdict}</Badge>}</div><p className="mt-1.5 text-xs text-ink-muted">{formatCodeDate(item.created_at)} · Question ID {item.question_id}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end">{typeof item.evaluation?.score === 'number' && <p className="text-sm font-semibold text-ink">AI score: {item.evaluation.score}/100</p>}<Button as={Link} to={`/dashboard/coding-interview/submission/${encodeURIComponent(item.submission_id)}`} variant="outline" size="sm">View details<ArrowRight size={14} /></Button></div></div></Card>)}</div> : <Card><EmptyState icon={Braces} title="No coding submissions yet" description="Your saved evaluations will appear here after you submit a solution." action={<Button as={Link} to="/dashboard/coding-interview">Generate a coding question</Button>} /></Card>}
  </div>
}
