import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Bug } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCodeDebugHistory } from '../../api/codeDebuggerApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { apiError, formatCodeDate } from './codeDebuggerUtils'

export default function CodeDebuggerHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { const { data } = await getCodeDebugHistory(); setHistory(Array.isArray(data?.history) ? data.history : []); setError('') }
    catch (requestError) { setError(apiError(requestError)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load() }); return () => { active = false } }, [load])
  return <div>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><Button as={Link} to="/dashboard/code-debugger" variant="ghost" size="sm"><ArrowLeft size={15} />Code Debugger</Button><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">Debug reports</h1><p className="mt-2 text-sm text-ink-muted">Saved AI static-analysis reports, newest first.</p></div><Button as={Link} to="/dashboard/code-debugger">Analyze code</Button></header>
    {error ? <Card><ErrorState title="Report history unavailable" message={error} onRetry={load} /></Card> : loading ? <div className="grid gap-3">{[0, 1, 2].map((item) => <Card key={item}><LoadingSkeleton className="h-5 w-48" /><LoadingSkeleton className="mt-4 h-4 w-64" /></Card>)}</div> : history.length ? <div className="grid gap-3">{history.map((item) => <Card key={item.debug_id} as="article" className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200"><Bug size={20} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ink">{item.summary || 'Code analysis report'}</h2>{typeof item.has_errors === 'boolean' && <Badge tone={item.has_errors ? 'warning' : 'success'}>{item.has_errors ? 'Issues reported' : 'No clear issues'}</Badge>}{item.overall_severity && <Badge>{item.overall_severity}</Badge>}</div><p className="mt-1.5 text-xs text-ink-muted">{item.programming_language} · {formatCodeDate(item.created_at)}</p></div><Button as={Link} to={`/dashboard/code-debugger/${encodeURIComponent(item.debug_id)}`} variant="outline" size="sm">View report<ArrowRight size={14} /></Button></div></Card>)}</div> : <Card><EmptyState icon={Bug} title="No reports yet" description="Reports you generate with the debugger will be saved here." action={<Button as={Link} to="/dashboard/code-debugger">Analyze a code snippet</Button>} /></Card>}
  </div>
}
