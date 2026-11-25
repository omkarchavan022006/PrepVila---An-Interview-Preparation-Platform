import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, ClipboardCheck, FileBarChart2, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getInterviewFeedbackHistory } from '../../api/interviewFeedbackApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { formatFeedbackDate, getFeedbackError } from './feedbackUtils'

export default function FeedbackHistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loadHistory = useCallback(async () => {
    try {
      const { data } = await getInterviewFeedbackHistory()
      setHistory(Array.isArray(data?.history) ? data.history : [])
      setError('')
    } catch (requestError) { setError(getFeedbackError(requestError)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void loadHistory() }); return () => { active = false } }, [loadHistory])

  return <div>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><Badge tone="violet"><History size={13} className="mr-1" />Saved reports</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Feedback history</h1><p className="mt-2 text-sm text-ink-muted">Browse your saved AI feedback reports. The service returns up to 50 recent reports.</p></div><Button as={Link} to="/dashboard/feedback" variant="outline"><FileBarChart2 size={16} />Generate report</Button></header>
    {error ? <Card><ErrorState title="Feedback history unavailable" message={error} onRetry={loadHistory} /></Card> : loading ? <div className="grid gap-3">{[0, 1, 2].map((item) => <Card key={item} className="p-5"><LoadingSkeleton className="h-5 w-56" /><LoadingSkeleton className="mt-4 h-4 w-40" /></Card>)}</div> : history.length === 0 ? <Card><EmptyState title="No feedback reports yet" description="Generate a report after completing a mock interview. Saved reports will be listed here." icon={ClipboardCheck} action={<Button as={Link} to="/dashboard/feedback">Choose an interview</Button>} /></Card> : <div className="grid gap-3">{history.map((report) => <Card as="article" key={report.feedback_id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><FileBarChart2 size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ink">{report.job_title || 'Interview feedback report'}</h2>{report.overall_rating && <Badge tone="violet">{report.overall_rating}</Badge>}</div><p className="mt-1.5 text-xs text-ink-muted">Generated {formatFeedbackDate(report.created_at)}</p></div><div className="flex items-center justify-between gap-4 sm:justify-end">{typeof report.overall_score === 'number' && <div className="text-right"><p className="text-lg font-bold text-ink">{report.overall_score}<span className="text-xs font-medium text-ink-muted">/100</span></p><p className="text-xs text-ink-muted">Overall score</p></div>}<Button as={Link} to={`/dashboard/feedback/${encodeURIComponent(report.feedback_id)}`} variant="outline" size="sm">View report<ArrowRight size={14} /></Button></div></div></Card>)}</div>}
  </div>
}
