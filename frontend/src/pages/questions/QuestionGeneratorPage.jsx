import { useEffect, useState } from 'react'
import { Clock3, FileQuestion, ListRestart, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getJobs } from '../../api/jobsApi'
import { getResumes } from '../../api/resumeApi'
import { generateQuestions } from '../../api/questionsApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import QuestionSetView from './QuestionSetView'

function getErrorMessage(error) {
  const status = error.response?.status
  if (status === 401) return 'Your session has expired. Sign in again to continue.'
  if (status === 429) return 'The AI service is receiving too many requests. Wait a moment, then try again.'
  if (status === 503 || error.response?.data?.retry === true) return 'The AI service is temporarily unavailable. You can retry manually.'
  if (status === 502 || status === 500) return error.response?.data?.error || 'The server could not generate questions right now.'
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'The request timed out. Please try again.'
  if (!error.response) return 'The server could not be reached. Check your connection and try again.'
  return error.response.data?.error || error.response.data?.detail || 'Question generation failed. Check the selected options and try again.'
}

export default function QuestionGeneratorPage() {
  const [jobs, setJobs] = useState([])
  const [resumes, setResumes] = useState([])
  const [loadingChoices, setLoadingChoices] = useState(true)
  const [choicesError, setChoicesError] = useState('')
  const [jobId, setJobId] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [questionType, setQuestionType] = useState('technical')
  const [difficulty, setDifficulty] = useState('medium')
  const [numberOfQuestions, setNumberOfQuestions] = useState('10')
  const [formError, setFormError] = useState('')
  const [canRetry, setCanRetry] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(null)

  async function reloadChoices() {
    setLoadingChoices(true)
    setChoicesError('')
    try {
      const [jobResponse, resumeResponse] = await Promise.all([
        getJobs({ page: 1, limit: 100 }),
        getResumes(),
      ])
      setJobs(Array.isArray(jobResponse.data?.items) ? jobResponse.data.items : [])
      setResumes(Array.isArray(resumeResponse.data?.resumes) ? resumeResponse.data.resumes : [])
    } catch (error) {
      setChoicesError(getErrorMessage(error))
    } finally {
      setLoadingChoices(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([getJobs({ page: 1, limit: 100 }), getResumes()])
      .then(([jobResponse, resumeResponse]) => {
        if (!active) return
        setJobs(Array.isArray(jobResponse.data?.items) ? jobResponse.data.items : [])
        setResumes(Array.isArray(resumeResponse.data?.resumes) ? resumeResponse.data.resumes : [])
        setChoicesError('')
      })
      .catch((error) => { if (active) setChoicesError(getErrorMessage(error)) })
      .finally(() => { if (active) setLoadingChoices(false) })
    return () => { active = false }
  }, [])

  function buildPayload() {
    const count = Number(numberOfQuestions)
    if (!jobId) {
      setFormError('Choose a job role before generating questions.')
      return null
    }
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      setFormError('Choose a whole number between 1 and 20.')
      return null
    }
    const payload = {
      job_id: jobId,
      question_type: questionType,
      difficulty,
      number_of_questions: count,
    }
    if (resumeId) payload.resume_id = resumeId
    return payload
  }

  async function runGeneration() {
    if (generating) return
    setFormError('')
    setCanRetry(false)
    const payload = buildPayload()
    if (!payload) return
    setGenerating(true)
    try {
      const { data } = await generateQuestions(payload)
      setGenerated(data && typeof data === 'object' ? data : null)
      toast.success(data?.message || 'Interview questions generated.')
    } catch (error) {
      setFormError(getErrorMessage(error))
      setCanRetry(error.response?.data?.retry === true || error.response?.status === 429 || !error.response)
      toast.error(getErrorMessage(error))
    } finally {
      setGenerating(false)
    }
  }

  function submit(event) {
    event.preventDefault()
    runGeneration()
  }

  const completedResumes = resumes.filter((resume) => resume.analysis_status === 'completed')

  return <div>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9"><div><Badge tone="violet"><Sparkles size={12} className="mr-1" aria-hidden="true" />AI preparation</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Interview question generator</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">Generate role-focused interview questions using a job role and your chosen practice settings.</p></div><Link to="/dashboard/questions/history" className="inline-flex min-h-10 items-center gap-2 rounded-control border border-border-soft bg-surface px-3 text-sm font-semibold text-ink-muted transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:hover:bg-brand-950/40 dark:hover:text-brand-300"><Clock3 size={16} />Question history</Link></header>

    <Card className="mb-6 overflow-hidden p-0"><div className="border-b border-border-soft px-5 py-4 sm:px-6"><h2 className="font-semibold tracking-tight text-ink">Build your question set</h2><p className="mt-1 text-sm text-ink-muted">Select a role and customize the generated question set.</p></div>
      {choicesError ? <div className="p-3 sm:p-5"><ErrorState title="Could not load job and resume choices" message={choicesError} onRetry={reloadChoices} /></div> : loadingChoices ? <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"><LoadingSkeleton className="h-16" /><LoadingSkeleton className="h-16" /><LoadingSkeleton className="h-16" /><LoadingSkeleton className="h-16" /></div> : <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
        <label htmlFor="question-job" className="grid gap-2 text-sm font-semibold text-ink-secondary">Job role <span className="text-rose-600">Required</span><select id="question-job" required value={jobId} onChange={(event) => { setJobId(event.target.value); setGenerated(null); setFormError('') }} className="min-h-12 w-full rounded-control border border-border-strong/80 bg-surface px-4 text-sm font-normal text-ink outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="">Select a job role</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.title}{job.category ? ` · ${job.category}` : ''}</option>)}</select></label>
        {jobs.length === 0 && <p className="-mt-3 rounded-control border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Add or browse a job role before generating questions. <Link to="/dashboard/jobs" className="font-semibold underline underline-offset-2">Open job roles</Link></p>}
        <label htmlFor="question-resume" className="grid gap-2 text-sm font-semibold text-ink-secondary">Resume <span className="text-xs font-normal text-ink-muted">Optional · choose a completed analysis to personalize by skills</span><select id="question-resume" value={resumeId} onChange={(event) => { setResumeId(event.target.value); setGenerated(null) }} className="min-h-12 w-full rounded-control border border-border-strong/80 bg-surface px-4 text-sm font-normal text-ink outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="">No resume</option>{completedResumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.filename || 'Analyzed resume'}</option>)}</select></label>
        {completedResumes.length === 0 && <p className="-mt-3 text-xs text-ink-muted">No completed resume analysis is available. You can still generate questions without one. <Link to="/dashboard/resume-analyzer" className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300">Analyze a resume</Link></p>}
        <div className="grid gap-4 sm:grid-cols-3"><label htmlFor="question-type" className="grid gap-2 text-sm font-semibold text-ink-secondary">Question type<select id="question-type" value={questionType} onChange={(event) => { setQuestionType(event.target.value); setGenerated(null) }} className="min-h-12 w-full rounded-control border border-border-strong/80 bg-surface px-4 text-sm font-normal capitalize text-ink outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="technical">Technical</option><option value="hr">HR</option><option value="mixed">Mixed</option></select></label><label htmlFor="question-difficulty" className="grid gap-2 text-sm font-semibold text-ink-secondary">Difficulty<select id="question-difficulty" value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setGenerated(null) }} className="min-h-12 w-full rounded-control border border-border-strong/80 bg-surface px-4 text-sm font-normal capitalize text-ink outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label htmlFor="question-count" className="grid gap-2 text-sm font-semibold text-ink-secondary">Number of questions<input id="question-count" type="number" inputMode="numeric" min="1" max="20" step="1" required value={numberOfQuestions} onChange={(event) => { setNumberOfQuestions(event.target.value); setGenerated(null) }} className="min-h-12 w-full rounded-control border border-border-strong/80 bg-surface px-4 text-sm font-normal text-ink outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40" /></label></div>
        {formError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"><span>{formError}</span>{canRetry && <Button type="button" size="sm" variant="outline" disabled={generating} onClick={runGeneration}>Try again</Button>}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-4"><p className="text-xs text-ink-subtle">The server requires a job role. Resume personalization is optional.</p><Button type="submit" loading={generating} disabled={!jobs.length}><FileQuestion size={16} />Generate questions</Button></div>
      </form>}
    </Card>

    {generated && <div className="mt-7">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><Badge tone="success">Generated set</Badge><h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{generated.job_title || 'Your questions'}</h2><div className="mt-2 flex flex-wrap gap-2">{generated.question_type && <Badge>{generated.question_type}</Badge>}{generated.difficulty && <Badge tone="info" className="capitalize">{generated.difficulty}</Badge>}{generated.generation_id && <Badge tone="neutral">Saved to history</Badge>}</div></div><div className="flex flex-wrap gap-2">{generated.generation_id && <Link to={`/dashboard/questions/${encodeURIComponent(generated.generation_id)}`} className="inline-flex min-h-10 items-center rounded-control border border-border-strong px-3 text-sm font-semibold text-ink-secondary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60">Open saved set</Link>}<Button variant="outline" onClick={runGeneration} loading={generating} disabled={loadingChoices || !jobs.length}><ListRestart size={16} />Generate another set</Button></div></div>
      <QuestionSetView questions={generated.questions} />
    </div>}

    {!generated && !loadingChoices && !choicesError && <Card><EmptyState title="Ready when you are" description="Choose a job role and settings to generate a new question set. Generated sets are saved to your history." icon={FileQuestion} /></Card>}
  </div>
}
