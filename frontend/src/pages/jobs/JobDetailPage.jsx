import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, ClipboardList, Code2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getJob } from '../../api/jobsApi'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'

function getErrorMessage(error) {
  return error.response?.data?.error || error.response?.data?.detail || 'Could not load this job role. Please try again.'
}

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function ListSection({ title, items, icon: Icon }) {
  if (!Array.isArray(items) || items.length === 0) return null
  return <Card as="article" className="p-5 sm:p-6"><div className="mb-4 flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-300"><Icon size={17} aria-hidden="true" /></span><h2 className="font-semibold tracking-tight text-ink">{title}</h2></div><ul className="grid gap-3">{items.map((item, index) => <li key={`${index}-${item}`} className="flex items-start gap-2.5 text-sm leading-6 text-ink-secondary"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />{item}</li>)}</ul></Card>
}

export default function JobDetailPage() {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadJob = useCallback(async () => {
    try {
      const { data } = await getJob(jobId)
      setError('')
      setJob(data?.job || null)
      return true
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      return false
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    let active = true
    getJob(jobId)
      .then(({ data }) => { if (active) { setError(''); setJob(data?.job || null) } })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [jobId])

  async function retry() {
    setLoading(true)
    setError('')
    await loadJob()
  }

  return <div>
    <Link to="/dashboard/jobs" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:hover:text-brand-300"><ArrowLeft size={16} />Back to job roles</Link>
    {loading ? <><LoadingSkeleton className="h-48" /><div className="mt-5 grid gap-4 md:grid-cols-2"><LoadingSkeleton className="h-56" /><LoadingSkeleton className="h-56" /></div></> : error ? <Card><ErrorState title="Job role unavailable" message={error} onRetry={retry} /></Card> : job ? <>
      <Card className="mb-5 overflow-hidden p-0"><div className="relative p-5 sm:p-8"><div aria-hidden="true" className="absolute -right-14 -top-20 size-64 rounded-full bg-brand-200/30 blur-3xl dark:bg-brand-700/10" /><div className="relative flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-blue-50 text-brand-700 dark:border-brand-900 dark:from-brand-950 dark:to-blue-950/50 dark:text-brand-200"><BriefcaseBusiness size={22} aria-hidden="true" /></span><div className="min-w-0"><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{job.category}</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{job.title}</h1><div className="mt-4 flex flex-wrap gap-2">{job.experience_level && <Badge>{job.experience_level}</Badge>}{job.difficulty && <Badge tone="info" className="capitalize">{job.difficulty}</Badge>}</div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-subtle">{formatDate(job.created_at) && <span>Created {formatDate(job.created_at)}</span>}{formatDate(job.updated_at) && <span>Updated {formatDate(job.updated_at)}</span>}</div></div></div></div></Card>
      <div className="grid gap-4 xl:grid-cols-2"><Card as="article" className="p-5 sm:p-6"><div className="mb-4 flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-300"><ClipboardList size={17} aria-hidden="true" /></span><h2 className="font-semibold tracking-tight text-ink">Role description</h2></div><p className="whitespace-pre-line text-sm leading-7 text-ink-secondary">{job.description || 'No description was provided.'}</p></Card><ListSection title="Required skills" items={job.required_skills} icon={Code2} /><ListSection title="Responsibilities" items={job.responsibilities} icon={CheckCircle2} /></div>
    </> : <Card><EmptyState title="Job role not found" description="This job may have been removed from the catalog." icon={BriefcaseBusiness} /></Card>}
  </div>
}
