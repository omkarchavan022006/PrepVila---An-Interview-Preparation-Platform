import { useState } from 'react'
import { Check, Clipboard, Code2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

export default function CodeDebugResult({ result }) {
  const [copied, setCopied] = useState(false)
  if (!result || typeof result !== 'object') return null
  async function copyCorrectedCode() {
    try { await navigator.clipboard.writeText(result.corrected_code); setCopied(true); toast.success('Corrected code copied.'); window.setTimeout(() => setCopied(false), 1600) }
    catch { toast.error('Clipboard access is unavailable in this browser.') }
  }
  const issues = Array.isArray(result.issues) ? result.issues : []
  return <section aria-live="polite" className="mt-6 grid gap-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Badge tone={result.has_errors ? 'warning' : 'success'}>{result.has_errors ? 'Issues reported' : 'No clear issues reported'}</Badge><h2 className="mt-2 text-xl font-semibold text-ink">AI code analysis</h2><p className="mt-1 text-sm text-ink-muted">Static analysis only. The submitted code was not executed.</p></div>{typeof result.overall_severity === 'string' && <Badge tone={result.overall_severity === 'critical' || result.overall_severity === 'high' ? 'danger' : result.overall_severity === 'medium' ? 'warning' : 'info'}>Severity: {result.overall_severity}</Badge>}</div>
    {typeof result.summary === 'string' && <Card className="p-5"><h3 className="font-semibold text-ink">Summary</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{result.summary}</p></Card>}
    {typeof result.root_cause === 'string' && result.root_cause && <Card className="p-5"><h3 className="flex items-center gap-2 font-semibold text-ink"><TriangleAlert size={16} className="text-amber-500" />Root cause</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{result.root_cause}</p></Card>}
    {issues.length > 0 && <div className="grid gap-3">{issues.map((issue, index) => <Card key={`${index}-${issue.title || 'issue'}`} className="p-5"><div className="flex flex-wrap items-center gap-2">{issue.title && <h3 className="font-semibold text-ink">{issue.title}</h3>}{issue.error_type && <Badge>{issue.error_type}</Badge>}{issue.severity && <Badge tone={issue.severity === 'critical' || issue.severity === 'high' ? 'danger' : issue.severity === 'medium' ? 'warning' : 'info'}>{issue.severity}</Badge>}{typeof issue.line_number === 'number' && <span className="text-xs text-ink-muted">Line {issue.line_number}</span>}</div>{issue.explanation && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{issue.explanation}</p>}{issue.suggestion && <p className="mt-3 text-sm leading-6 text-ink-muted"><span className="font-semibold text-ink">Suggestion: </span>{issue.suggestion}</p>}</Card>)}</div>}
    {typeof result.corrected_code === 'string' && result.corrected_code && <Card className="p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-semibold text-ink"><Code2 size={16} />Suggested corrected code</h3><Button variant="outline" size="sm" onClick={copyCorrectedCode}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? 'Copied' : 'Copy code'}</Button></div><pre className="max-h-[36rem] overflow-auto rounded-control bg-[#0e1020] p-4 font-mono text-xs leading-6 text-slate-100"><code>{result.corrected_code}</code></pre><p className="mt-3 text-xs text-ink-muted">This suggestion is separate from your original code. Review it before using it.</p></Card>}
    {Array.isArray(result.corrections) && result.corrections.length > 0 && <Card className="p-5"><h3 className="font-semibold text-ink">Corrections described</h3><ul className="mt-3 grid gap-2">{result.corrections.map((item, index) => <li key={`${index}-${item}`} className="text-sm leading-6 text-ink-muted">{item}</li>)}</ul></Card>}
    {Array.isArray(result.optimization_suggestions) && result.optimization_suggestions.length > 0 && <Card className="p-5"><h3 className="font-semibold text-ink">Optimization suggestions</h3><ul className="mt-3 grid gap-2">{result.optimization_suggestions.map((item, index) => <li key={`${index}-${item}`} className="text-sm leading-6 text-ink-muted">{item}</li>)}</ul></Card>}
  </section>
}
