import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Bug, Code2, RotateCcw, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { analyzeCode, getCodeDebugHistory } from '../../api/codeDebuggerApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import Textarea from '../../components/common/Textarea'
import CodeDebugResult from './CodeDebugResult'
import { apiError, debuggerLanguages, formatCodeDate, hasUncertainOutcome } from './codeDebuggerUtils'

export default function CodeDebuggerPage() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [errorMessage, setErrorMessage] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [report, setReport] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [historyChecked, setHistoryChecked] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')

  const loadHistory = useCallback(async () => {
    try { const { data } = await getCodeDebugHistory(); setHistory(Array.isArray(data?.history) ? data.history : []); setHistoryError('') }
    catch (requestError) { setHistoryError(apiError(requestError)) }
    finally { setHistoryLoading(false) }
  }, [])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void loadHistory() }); return () => { active = false } }, [loadHistory])

  async function handleAnalyze(event) {
    event.preventDefault()
    if (!code.trim() || code.length > 20000 || submitting || (uncertain && !historyChecked)) return
    setSubmitting(true)
    setError('')
    setReport(null)
    setHistoryChecked(false)
    try {
      const { data } = await analyzeCode({ code, programming_language: language, error_message: errorMessage, expected_behavior: expectedBehavior })
      setReport(data)
      toast.success('AI code analysis completed.')
      await loadHistory()
    } catch (requestError) {
      setError(apiError(requestError, true))
      if (hasUncertainOutcome(requestError)) setUncertain(true)
    } finally { setSubmitting(false) }
  }

  function clearForm() {
    setCode('')
    setErrorMessage('')
    setExpectedBehavior('')
    setReport(null)
    setError('')
    setUncertain(false)
    setHistoryChecked(false)
  }

  return <div>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><Badge tone="violet"><Bug size={13} className="mr-1" />Developer workspace</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">AI Code Debugger</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Describe the issue and expected behavior to get an AI static analysis. Your code is not executed.</p></div><Button as={Link} to="/dashboard/code-debugger/history" variant="outline">Report history<ArrowRight size={15} /></Button></header>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <Card className="p-5 sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><Code2 size={19} />Analyze a code snippet</h2><p className="mt-1 text-sm text-ink-muted">Code is limited to 20,000 characters. Error and expected behavior are optional (up to 5,000 each).</p></div><Button variant="ghost" size="sm" onClick={clearForm} disabled={!code && !errorMessage && !expectedBehavior && !report}><RotateCcw size={14} />Clear</Button></div>
        <form onSubmit={handleAnalyze} className="grid gap-4">
          <div className="grid gap-2"><label htmlFor="debug-language" className="text-sm font-semibold text-ink-secondary">Programming language</label><select id="debug-language" value={language} onChange={(event) => { setLanguage(event.target.value); setReport(null) }} className="min-h-11 w-full rounded-control border border-border-strong/80 bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40">{debuggerLanguages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <Textarea label="Code" value={code} onChange={(event) => { setCode(event.target.value); setReport(null); setError('') }} maxLength={20000} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" required placeholder="Paste the code you want reviewed…" className="min-h-[19rem] resize-y bg-[#0e1020] font-mono text-xs leading-6 text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:ring-brand-400/20" hint={`${code.length.toLocaleString()} / 20,000 characters`} />
          <Textarea label="Error message (optional)" value={errorMessage} onChange={(event) => { setErrorMessage(event.target.value); setReport(null) }} maxLength={5000} rows={3} placeholder="Paste an error message, if available…" className="min-h-24" hint={`${errorMessage.length.toLocaleString()} / 5,000 characters`} />
          <Textarea label="Expected behavior (optional)" value={expectedBehavior} onChange={(event) => { setExpectedBehavior(event.target.value); setReport(null) }} maxLength={5000} rows={3} placeholder="Describe what the code should do…" className="min-h-24" hint={`${expectedBehavior.length.toLocaleString()} / 5,000 characters`} />
          {error && <div role="alert" className="rounded-control border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">{error}{uncertain && <p className="mt-2 font-medium">This request may have been processed. Check report history before submitting it again.</p>}</div>}
          {uncertain && <div className="grid gap-2"><Button as={Link} to="/dashboard/code-debugger/history" target="_blank" rel="noreferrer" variant="outline" size="sm">Review report history<ArrowRight size={14} /></Button><Button type="button" variant="ghost" size="sm" onClick={() => setHistoryChecked(true)}>I checked history; allow another analysis</Button></div>}
          <Button type="submit" loading={submitting} disabled={!code.trim() || code.length > 20000 || submitting || (uncertain && !historyChecked)}><Sparkles size={16} />Debug code</Button>
        </form>
      </Card>
      <Card className="p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">Recent reports</h2><p className="mt-1 text-sm text-ink-muted">Your saved static-analysis results.</p></div><Link to="/dashboard/code-debugger/history" className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300">View all</Link></div>
        {historyError ? <div className="mt-4"><ErrorState title="Report history unavailable" message={historyError} onRetry={loadHistory} /></div> : historyLoading ? <div className="mt-4 grid gap-2">{[0, 1, 2].map((n) => <LoadingSkeleton key={n} className="h-16" />)}</div> : history.length ? <div className="mt-4 divide-y divide-border-soft">{history.slice(0, 6).map((item) => <div key={item.debug_id} className="flex items-start gap-3 py-3"><div className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200"><Bug size={15} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-ink">{item.summary || 'Debug report'}</p>{typeof item.has_errors === 'boolean' && <Badge tone={item.has_errors ? 'warning' : 'success'}>{item.has_errors ? 'Issues found' : 'No clear issues'}</Badge>}</div><p className="mt-1 text-xs text-ink-muted">{item.programming_language} · {formatCodeDate(item.created_at)}</p><Link to={`/dashboard/code-debugger/${encodeURIComponent(item.debug_id)}`} className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300">Open report</Link></div></div>)}</div> : <EmptyState icon={Bug} title="No saved reports" description="Your debugging results will appear here after analysis." />}
      </Card>
    </div>
    {report?.result && <div className="mt-8"><header className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-semibold tracking-tight text-ink">Analysis report</h2><p className="mt-1 text-sm text-ink-muted">{report.programming_language} · {report.evaluation_type}</p></div>{report.debug_id && <Link className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300" to={`/dashboard/code-debugger/${encodeURIComponent(report.debug_id)}`}>Open saved report</Link>}</header><CodeDebugResult result={report.result} /></div>}
    {report && !report.result && <Card className="mt-6"><EmptyState icon={Bug} title="No result details were returned" description="The server acknowledged the request but did not include a result payload." /></Card>}
  </div>
}
