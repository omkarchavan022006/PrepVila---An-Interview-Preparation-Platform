import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Clock3, FileQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getQuestionHistory } from '../../api/questionsApi'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'

function getErrorMessage(error) {
  if (error.response?.status === 401) return 'Your session has expired. Sign in again to view question history.'
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'The history request timed out. Please try again.'
  if (!error.response) return 'The server could not be reached. Check your connection and try again.'
  return error.response.data?.error || error.response.data?.detail || 'Could not load question history.'
}

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function QuestionHistoryPage() {
  const [history, setHistory] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadHistory() {
    setLoading(true)
    setError('')
    try {
      const { data } = await getQuestionHistory()
      setHistory(Array.isArray(data?.history) ? data.history : [])
      setCount(typeof data?.count === 'number' ? data.count : 0)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    getQuestionHistory()
      .then(({ data }) => {
        if (!active) return
        setHistory(Array.isArray(data?.history) ? data.history : [])
        setCount(typeof data?.count === 'number' ? data.count : 0)
      })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return <div>
    <Link to="/dashboard/questions" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:hover:text-brand-300"><ArrowLeft size={16} />Back to generator</Link>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><Badge tone="violet"><Clock3 size={12} className="mr-1" aria-hidden="true" />Saved sets</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Question history</h1><p className="mt-2 text-sm leading-6 text-ink-muted">Your most recent generated interview question sets.</p></div>{!loading && !error && <Badge>{count} {count === 1 ? 'set' : 'sets'}</Badge>}</header>

    {error ? <Card><ErrorState title="Question history unavailable" message={error} onRetry={loadHistory} /></Card> : loading ? <div className="grid gap-3">{[0, 1, 2].map((item) => <Card key={item} className="p-5"><LoadingSkeleton className="h-5 w-56" /><LoadingSkeleton className="mt-3 h-4 w-40" /><LoadingSkeleton className="mt-5 h-9 w-32" /></Card>)}</div> : history.length === 0 ? <Card><EmptyState title="No generated sets yet" description="Question sets you generate will appear here. The history endpoint returns up to 50 most recent sets." icon={FileQuestion} action={<Link to="/dashboard/questions" className="inline-flex min-h-11 items-center rounded-control border border-brand-600 bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-sm font-semibold text-white shadow-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/70">Generate questions</Link>} /></Card> : <div className="grid gap-3">{history.map((item) => <Card as="article" key={item.generation_id} className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-300"><FileQuestion size={19} aria-hidden="true" /></span><div className="min-w-0 flex-1"><h2 className="truncate text-base font-semibold text-ink">{item.job_title || 'Interview question set'}</h2><div className="mt-2 flex flex-wrap items-center gap-2">{item.question_type && <Badge>{item.question_type}</Badge>}{item.difficulty && <Badge tone="info" className="capitalize">{item.difficulty}</Badge>}{typeof item.number_of_questions === 'number' && <span className="text-xs text-ink-muted">{item.number_of_questions} {item.number_of_questions === 1 ? 'question' : 'questions'}</span>}{formatDate(item.created_at) && <span className="text-xs text-ink-subtle">{formatDate(item.created_at)}</span>}</div></div><Link to={`/dashboard/questions/${encodeURIComponent(item.generation_id)}`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-control border border-border-strong px-3 text-sm font-semibold text-ink-secondary transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:hover:bg-brand-950/40">Open set<ArrowRight size={15} /></Link></div></Card>)}</div>}
  </div>
}
