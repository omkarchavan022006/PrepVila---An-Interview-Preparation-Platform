import { useCallback, useEffect, useRef, useState } from 'react'
import { BriefcaseBusiness, ChevronLeft, ChevronRight, Edit3, Plus, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { createJob, deleteJob, getJobs, updateJob } from '../../api/jobsApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import Input from '../../components/common/Input'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import JobFormDialog from './JobFormDialog'

const PAGE_LIMIT = 10
const EMPTY_FILTERS = { search: '', category: '', experience: '', difficulty: '' }

function getErrorMessage(error) {
  return error.response?.data?.error || error.response?.data?.detail || 'Could not complete this request. Please try again.'
}

function filterParams(filters, page) {
  const params = { page, limit: PAGE_LIMIT }
  for (const key of Object.keys(EMPTY_FILTERS)) {
    const value = filters[key]?.trim()
    if (value) params[key] = value
  }
  return params
}

function ConfirmDelete({ job, busy, onCancel, onConfirm }) {
  const cancelRef = useRef(null)
  useEffect(() => {
    cancelRef.current?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel])

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}>
    <section role="alertdialog" aria-modal="true" aria-labelledby="delete-job-heading" aria-describedby="delete-job-description" className="w-full max-w-md rounded-panel border border-border-soft bg-surface p-6 shadow-float">
      <span className="grid size-11 place-items-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"><Trash2 size={19} aria-hidden="true" /></span>
      <h2 id="delete-job-heading" className="mt-4 text-lg font-semibold text-ink">Delete this job role?</h2>
      <p id="delete-job-description" className="mt-2 break-words text-sm leading-6 text-ink-muted">This removes <strong className="font-semibold text-ink">{job?.title}</strong> from the job catalog.</p>
      <div className="mt-6 flex justify-end gap-2"><Button ref={cancelRef} variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button variant="danger" loading={busy} onClick={onConfirm}>Delete job</Button></div>
    </section>
  </div>
}

export default function JobsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [jobs, setJobs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formState, setFormState] = useState(null)
  const [formBusy, setFormBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchJobs = useCallback(async (nextFilters = filters, nextPage = 1) => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getJobs(filterParams(nextFilters, nextPage))
      setJobs(Array.isArray(data?.items) ? data.items : [])
      setTotal(typeof data?.total === 'number' ? data.total : 0)
      setPage(typeof data?.page === 'number' ? data.page : nextPage)
      setTotalPages(typeof data?.total_pages === 'number' ? data.total_pages : 0)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    let active = true
    getJobs({ page: 1, limit: PAGE_LIMIT })
      .then(({ data }) => {
        if (!active) return
        setJobs(Array.isArray(data?.items) ? data.items : [])
        setTotal(typeof data?.total === 'number' ? data.total : 0)
        setPage(typeof data?.page === 'number' ? data.page : 1)
        setTotalPages(typeof data?.total_pages === 'number' ? data.total_pages : 0)
      })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function changeFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function submitFilters(event) {
    event.preventDefault()
    fetchJobs(filters, 1)
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
    fetchJobs(EMPTY_FILTERS, 1)
  }

  async function handleSaveJob(jobData) {
    setFormBusy(true)
    setFormError('')
    try {
      const editing = Boolean(formState?.job)
      const { data } = editing ? await updateJob(formState.job.id, jobData) : await createJob(jobData)
      toast.success(data?.message || (editing ? 'Job role updated.' : 'Job role created.'))
      setFormState(null)
      if (!editing) {
        setFilters(EMPTY_FILTERS)
        await fetchJobs(EMPTY_FILTERS, 1)
      } else {
        await fetchJobs(filters, page)
      }
    } catch (requestError) {
      const message = getErrorMessage(requestError)
      setFormError(message)
      toast.error(message)
    } finally {
      setFormBusy(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { data } = await deleteJob(deleteTarget.id)
      toast.success(data?.message || 'Job role deleted.')
      setDeleteTarget(null)
      await fetchJobs(filters, jobs.length === 1 && page > 1 ? page - 1 : page)
    } catch (requestError) {
      toast.error(getErrorMessage(requestError))
    } finally {
      setDeleting(false)
    }
  }

  return <div>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9"><div><Badge tone="violet"><BriefcaseBusiness size={12} className="mr-1" aria-hidden="true" />Career explorer</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Job roles</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">Explore role requirements and compare the skills each opportunity calls for.</p></div><Button onClick={() => { setFormError(''); setFormState({ job: null }) }}><Plus size={16} />Create job role</Button></header>

    <Card className="mb-5 p-4 sm:p-5"><form onSubmit={submitFilters} aria-label="Search and filter job roles"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Input label="Search title" name="search" value={filters.search} onChange={changeFilter} placeholder="Search job titles" autoComplete="off" /><Input label="Category" name="category" value={filters.category} onChange={changeFilter} placeholder="Exact category" /><Input label="Experience" name="experience" value={filters.experience} onChange={changeFilter} placeholder="Experience level" /><Input label="Difficulty" name="difficulty" value={filters.difficulty} onChange={changeFilter} placeholder="Difficulty" /></div><div className="mt-4 flex flex-wrap items-center justify-end gap-2"><Button type="button" variant="ghost" onClick={clearFilters}>Clear filters</Button><Button type="submit" loading={loading}><Search size={15} />Search roles</Button></div></form><p className="mt-3 text-xs text-ink-subtle">Search matches job titles. Filters use exact backend matches. Results are ordered newest first by the service.</p></Card>

    <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-semibold tracking-tight text-ink">Available roles</h2>{!loading && !error && <span className="text-xs text-ink-muted">{total} {total === 1 ? 'role' : 'roles'}</span>}</div>
    {error ? <Card><ErrorState title="Job roles unavailable" message={error} onRetry={() => fetchJobs(filters, page)} /></Card> : loading ? <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((item) => <Card key={item} className="p-5"><LoadingSkeleton className="h-5 w-52" /><LoadingSkeleton className="mt-4 h-4 w-32" /><LoadingSkeleton className="mt-5 h-20 w-full" /><LoadingSkeleton className="mt-5 h-8 w-40" /></Card>)}</div> : jobs.length === 0 ? <Card><EmptyState title="No job roles found" description={total === 0 && Object.values(filters).every((value) => !value.trim()) ? 'The job catalog is empty right now.' : 'Try changing or clearing your filters.'} icon={BriefcaseBusiness} action={Object.values(filters).some((value) => value.trim()) ? <Button variant="outline" onClick={clearFilters}>Clear filters</Button> : undefined} /></Card> : <div className="grid gap-4 lg:grid-cols-2">{jobs.map((job) => <Card as="article" key={job.id} className="flex h-full flex-col p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-brand-700 dark:text-brand-300">{job.category}</p><h3 className="mt-1.5 break-words text-lg font-semibold tracking-tight text-ink">{job.title}</h3></div><div className="flex shrink-0 gap-1"><Button variant="ghost" size="sm" aria-label={`Edit ${job.title}`} onClick={() => { setFormError(''); setFormState({ job }) }}><Edit3 size={15} /><span className="sr-only">Edit</span></Button><Button variant="ghost" size="sm" aria-label={`Delete ${job.title}`} onClick={() => setDeleteTarget(job)} className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"><Trash2 size={15} /><span className="sr-only">Delete</span></Button></div></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-muted">{job.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">{job.experience_level && <Badge>{job.experience_level}</Badge>}{job.difficulty && <Badge tone="info" className="capitalize">{job.difficulty}</Badge>}</div>
        {Array.isArray(job.required_skills) && job.required_skills.length > 0 && <div className="mt-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Required skills</p><div className="flex flex-wrap gap-1.5">{job.required_skills.slice(0, 6).map((skill) => <Badge key={skill}>{skill}</Badge>)}{job.required_skills.length > 6 && <Badge>+{job.required_skills.length - 6}</Badge>}</div></div>}
        <div className="mt-auto flex justify-end border-t border-border-soft pt-4"><Link to={`/dashboard/jobs/${encodeURIComponent(job.id)}`} className="inline-flex min-h-10 items-center gap-2 rounded-control px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:text-brand-300 dark:hover:bg-brand-950/50">View details<ChevronRight size={16} /></Link></div>
      </Card>)}</div>}

    {!error && totalPages > 1 && <nav aria-label="Job results pages" className="mt-6 flex flex-wrap items-center justify-center gap-3"><Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => fetchJobs(filters, page - 1)}><ChevronLeft size={15} />Previous</Button><span className="text-sm text-ink-muted">Page {page} of {totalPages}</span><Button variant="outline" size="sm" disabled={loading || page >= totalPages} onClick={() => fetchJobs(filters, page + 1)}>Next<ChevronRight size={15} /></Button></nav>}

    {formState && <JobFormDialog key={formState.job?.id || 'create-job'} job={formState.job} busy={formBusy} error={formError} onClose={() => !formBusy && setFormState(null)} onSave={handleSaveJob} />}
    {deleteTarget && <ConfirmDelete job={deleteTarget} busy={deleting} onCancel={() => !deleting && setDeleteTarget(null)} onConfirm={handleDelete} />}
  </div>
}
