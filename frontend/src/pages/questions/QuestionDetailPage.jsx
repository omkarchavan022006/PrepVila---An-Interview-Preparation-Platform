import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Clock3, FileQuestion } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getQuestionGeneration } from '../../api/questionsApi'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import QuestionSetView from './QuestionSetView'

function getErrorMessage(error) {
  const status = error.response?.status
  if (status === 401) return 'Your session has expired. Sign in again to open this question set.'
  if (status === 400) return 'This question set ID is invalid.'
  if (status === 404) return 'This saved question set could not be found.'
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'The request timed out. Please try again.'
  if (!error.response) return 'The server could not be reached. Check your connection and try again.'
  return error.response.data?.error || error.response.data?.detail || 'Could not load this question set.'
}

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function QuestionDetailPage() {
  const { generationId } = useParams()
  const [generation, setGeneration] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadGeneration = useCallback(async () => {
    try {
      const { data } = await getQuestionGeneration(generationId)
      setError('')
      setGeneration(data && typeof data === 'object' ? data : null)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [generationId])

  useEffect(() => {
    let active = true
    getQuestionGeneration(generationId)
      .then(({ data }) => {
        if (!active) return
        setGeneration(data && typeof data === 'object' ? data : null)
        setError('')
      })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [generationId])

  async function retry() {
    setLoading(true)
    setError('')
    await loadGeneration()
  }

  return <div>
    <Link to="/dashboard/questions/history" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:hover:text-brand-300"><ArrowLeft size={16} />Back to question history</Link>
    {loading ? <><LoadingSkeleton className="h-32" /><div className="mt-5 grid gap-3"><LoadingSkeleton className="h-40" /><LoadingSkeleton className="h-40" /></div></> : error ? <Card><ErrorState title="Question set unavailable" message={error} onRetry={retry} /></Card> : generation ? <>
      <Card className="mb-5 overflow-hidden p-0"><div className="relative p-5 sm:p-7"><div aria-hidden="true" className="absolute -right-16 -top-20 size-60 rounded-full bg-brand-200/25 blur-3xl dark:bg-brand-700/10" /><div className="relative flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-blue-50 text-brand-700 dark:border-brand-900 dark:from-brand-950 dark:to-blue-950/50 dark:text-brand-200"><FileQuestion size={21} aria-hidden="true" /></span><div className="min-w-0"><Badge tone="violet">Saved question set</Badge><h1 className="mt-3 break-words font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{generation.job_title || 'Interview questions'}</h1><div className="mt-3 flex flex-wrap items-center gap-2">{generation.question_type && <Badge>{generation.question_type}</Badge>}{generation.difficulty && <Badge tone="info" className="capitalize">{generation.difficulty}</Badge>}{Array.isArray(generation.questions) && <span className="text-xs text-ink-muted">{generation.questions.length} {generation.questions.length === 1 ? 'question' : 'questions'}</span>}{formatDate(generation.created_at) && <span className="inline-flex items-center gap-1 text-xs text-ink-subtle"><Clock3 size={13} />{formatDate(generation.created_at)}</span>}</div></div></div></div></Card>
      <QuestionSetView questions={generation.questions} />
    </> : <Card><ErrorState title="Question set unavailable" message="No question set data was returned." /></Card>}
  </div>
}
