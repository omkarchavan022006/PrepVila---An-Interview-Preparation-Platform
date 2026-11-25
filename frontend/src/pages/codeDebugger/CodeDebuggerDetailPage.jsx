import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Code2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getCodeDebugReport } from '../../api/codeDebuggerApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import CodeDebugResult from './CodeDebugResult'
import { apiError, formatCodeDate } from './codeDebuggerUtils'

export default function CodeDebuggerDetailPage() {
  const { debugId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { const { data } = await getCodeDebugReport(debugId); setReport(data); setError('') }
    catch (requestError) { setError(apiError(requestError)) }
    finally { setLoading(false) }
  }, [debugId])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load() }); return () => { active = false } }, [load])
  if (loading) return <div className="grid gap-4"><LoadingSkeleton className="h-16" /><LoadingSkeleton className="h-48" /><LoadingSkeleton className="h-48" /></div>
  return <div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Button as={Link} to="/dashboard/code-debugger/history" variant="ghost" size="sm"><ArrowLeft size={15} />Report history</Button>{report?.created_at && <span className="text-xs text-ink-muted">{formatCodeDate(report.created_at)}</span>}</div>
    {error ? <Card><ErrorState title="Debug report unavailable" message={error} onRetry={load} /></Card> : report && <><header className="mb-6"><Badge>{report.programming_language || 'Language unavailable'}</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">Saved debug report</h1><p className="mt-2 text-sm text-ink-muted">{report.evaluation_type || 'AI static analysis only; submitted code was not executed.'}</p></header><Card className="mb-4 grid gap-4 p-5 sm:grid-cols-2"><div><h2 className="flex items-center gap-2 font-semibold text-ink"><Code2 size={16} />Original code</h2><pre className="mt-3 max-h-[30rem] overflow-auto rounded-control bg-[#0e1020] p-4 font-mono text-xs leading-6 text-slate-100"><code>{report.original_code}</code></pre></div><div className="grid content-start gap-4">{typeof report.error_message === 'string' && report.error_message && <div><h3 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Reported error</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{report.error_message}</p></div>}{typeof report.expected_behavior === 'string' && report.expected_behavior && <div><h3 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Expected behavior</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{report.expected_behavior}</p></div>}</div></Card><CodeDebugResult result={report.result} /></>}
  </div>
}
