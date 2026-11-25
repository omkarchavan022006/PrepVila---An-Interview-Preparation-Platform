import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getCodingSubmission } from '../../api/codingInterviewApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { apiError, formatCodeDate } from './codingInterviewUtils'

function Evaluation({ evaluation }) {
  if (!evaluation || typeof evaluation !== 'object') return <p className="text-sm text-ink-muted">No evaluation details were returned.</p>
  const fields = [['Correctness', evaluation.correctness], ['Logic', evaluation.logic], ['Time complexity', evaluation.time_complexity], ['Space complexity', evaluation.space_complexity], ['Code quality', evaluation.code_quality], ['Overall feedback', evaluation.overall_feedback]].filter(([, value]) => typeof value === 'string' && value)
  return <div className="grid gap-4">
    {typeof evaluation.score === 'number' && <Card className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">AI assessment score</p><p className="mt-1 text-3xl font-bold text-brand-700 dark:text-brand-200">{evaluation.score}<span className="text-base font-medium text-ink-muted">/100</span></p>{evaluation.verdict && <Badge tone="violet">{evaluation.verdict}</Badge>}</Card>}
    <div className="grid gap-3 md:grid-cols-2">{fields.map(([label, value]) => <Card key={label} className="p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{label}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{value}</p></Card>)}</div>
    {Array.isArray(evaluation.bugs) && <Card className="p-4"><h3 className="flex items-center gap-2 font-semibold text-ink"><CircleAlert size={16} />Potential issues</h3>{evaluation.bugs.length ? <ul className="mt-3 grid gap-2">{evaluation.bugs.map((item, index) => <li key={`${index}-${item}`} className="text-sm leading-6 text-ink-muted">{item}</li>)}</ul> : <p className="mt-2 text-sm text-ink-muted">No potential issues returned.</p>}</Card>}
    {Array.isArray(evaluation.suggestions) && evaluation.suggestions.length > 0 && <Card className="p-4"><h3 className="font-semibold text-ink">Suggestions</h3><ul className="mt-3 grid gap-2">{evaluation.suggestions.map((item, index) => <li key={`${index}-${item}`} className="text-sm leading-6 text-ink-muted">{item}</li>)}</ul></Card>}
  </div>
}

export default function CodingSubmissionDetailPage() {
  const { submissionId } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { const { data } = await getCodingSubmission(submissionId); setRecord(data); setError('') }
    catch (requestError) { setError(apiError(requestError)) }
    finally { setLoading(false) }
  }, [submissionId])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void load() }); return () => { active = false } }, [load])
  if (loading) return <div className="grid gap-4"><LoadingSkeleton className="h-16" /><LoadingSkeleton className="h-48" /><LoadingSkeleton className="h-48" /></div>
  return <div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Button as={Link} to="/dashboard/coding-interview/history" variant="ghost" size="sm"><ArrowLeft size={15} />Submission history</Button>{record?.created_at && <span className="text-xs text-ink-muted">{formatCodeDate(record.created_at)}</span>}</div>
    {error ? <Card><ErrorState title="Submission details unavailable" message={error} onRetry={load} /></Card> : record && <><header className="mb-6"><Badge>{record.programming_language || 'Language unavailable'}</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">Saved code evaluation</h1><p className="mt-2 text-sm text-ink-muted">AI static analysis only. Submitted code was not executed.</p></header><Card className="mb-4 p-5"><div className="mb-3 flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600" /><h2 className="font-semibold text-ink">Submitted code</h2></div><pre className="max-h-[34rem] overflow-auto rounded-control bg-[#0e1020] p-4 font-mono text-xs leading-6 text-slate-100"><code>{record.submitted_code}</code></pre><p className="mt-3 text-xs text-ink-muted">Question ID: {record.question_id}</p></Card><Evaluation evaluation={record.evaluation} /></>}
  </div>
}
