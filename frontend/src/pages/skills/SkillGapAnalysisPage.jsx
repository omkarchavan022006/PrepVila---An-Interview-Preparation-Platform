import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Compass, Lightbulb, ListChecks, Search, Sparkles, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { getJobs } from '../../api/jobsApi'
import { getResume, getResumes } from '../../api/resumeApi'
import { analyzeSkillGap } from '../../api/skillsApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'

function getErrorMessage(error) {
  return error.response?.data?.error || error.response?.data?.detail || 'Could not complete the skill gap analysis.'
}

function ResultList({ title, values, icon: Icon, tone = 'violet' }) {
  if (!Array.isArray(values) || values.length === 0) return null
  const color = tone === 'green'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
      : 'border-brand-100 bg-brand-50 text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200'
  return <Card as="article" className="p-5 sm:p-6"><div className="mb-4 flex items-center gap-2.5"><span className={`grid size-9 place-items-center rounded-xl border ${color}`}><Icon size={17} aria-hidden="true" /></span><h3 className="font-semibold tracking-tight text-ink">{title}</h3></div><ul className="grid gap-2.5">{values.map((value, index) => <li key={`${index}-${value}`} className="flex items-start gap-2.5 text-sm leading-6 text-ink-secondary"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />{value}</li>)}</ul></Card>
}

export default function SkillGapAnalysisPage() {
  const resumeCheckRequest = useRef(0)
  const [resumes, setResumes] = useState([])
  const [jobs, setJobs] = useState([])
  const [loadingChoices, setLoadingChoices] = useState(true)
  const [choicesError, setChoicesError] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [jobId, setJobId] = useState('')
  const [resumeSkillsState, setResumeSkillsState] = useState('idle')
  const [resumeSkillsError, setResumeSkillsError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [canRetryAnalysis, setCanRetryAnalysis] = useState(false)
  const [result, setResult] = useState(null)

  async function loadChoices() {
    setLoadingChoices(true)
    setChoicesError('')
    try {
      const [resumeResponse, jobResponse] = await Promise.all([
        getResumes(),
        getJobs({ page: 1, limit: 100 }),
      ])
      setResumes(Array.isArray(resumeResponse.data?.resumes) ? resumeResponse.data.resumes : [])
      setJobs(Array.isArray(jobResponse.data?.items) ? jobResponse.data.items : [])
    } catch (error) {
      setChoicesError(getErrorMessage(error))
    } finally {
      setLoadingChoices(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([getResumes(), getJobs({ page: 1, limit: 100 })])
      .then(([resumeResponse, jobResponse]) => {
        if (!active) return
        setResumes(Array.isArray(resumeResponse.data?.resumes) ? resumeResponse.data.resumes : [])
        setJobs(Array.isArray(jobResponse.data?.items) ? jobResponse.data.items : [])
        setChoicesError('')
      })
      .catch((error) => { if (active) setChoicesError(getErrorMessage(error)) })
      .finally(() => { if (active) setLoadingChoices(false) })
    return () => { active = false }
  }, [])

  async function selectResume(nextResumeId) {
    setResumeId(nextResumeId)
    setResult(null)
    setAnalysisError('')
    setResumeSkillsError('')
    const requestId = ++resumeCheckRequest.current
    if (!nextResumeId) {
      setResumeSkillsState('idle')
      return
    }
    setResumeSkillsState('loading')
    try {
      const { data } = await getResume(nextResumeId)
      if (requestId !== resumeCheckRequest.current) return
      const skills = data?.analysis?.technical_skills
      if (Array.isArray(skills) && skills.length > 0) setResumeSkillsState('ready')
      else setResumeSkillsState('missing')
    } catch (error) {
      if (requestId !== resumeCheckRequest.current) return
      setResumeSkillsError(getErrorMessage(error))
      setResumeSkillsState('error')
    }
  }

  async function submitAnalysis(event) {
    event.preventDefault()
    setAnalysisError('')
    setCanRetryAnalysis(false)
    if (!resumeId || !jobId) {
      setAnalysisError('Choose both an analyzed resume and a job role.')
      return
    }
    if (resumeSkillsState === 'missing') {
      setAnalysisError('This resume does not contain analyzed technical skills. Choose a resume with technical skills before continuing.')
      return
    }
    const selectedJob = jobs.find((job) => job.id === jobId)
    if (!Array.isArray(selectedJob?.required_skills) || selectedJob.required_skills.length === 0) {
      setAnalysisError('The selected job has no required skills to compare.')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await analyzeSkillGap({ resume_id: resumeId, job_id: jobId })
      setResult(data)
      toast.success(data?.message || 'Skill gap analysis completed.')
    } catch (error) {
      setAnalysisError(getErrorMessage(error))
      setCanRetryAnalysis(error.response?.data?.retry === true)
      toast.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const readyResumes = resumes.filter((resume) => resume.analysis_status === 'completed')
  const usableJobs = jobs.filter((job) => Array.isArray(job.required_skills) && job.required_skills.length > 0)
  const analysis = result?.analysis && typeof result.analysis === 'object' ? result.analysis : null
  const score = typeof analysis?.skill_gap_score === 'number' ? analysis.skill_gap_score : null
  const roadmap = Array.isArray(analysis?.learning_roadmap) ? analysis.learning_roadmap : []

  function renderRoadmap() {
    if (!roadmap.length) return null
    return <section aria-labelledby="learning-roadmap-heading" className="mt-5"><div className="mb-3 flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-300"><Compass size={17} aria-hidden="true" /></span><div><h3 id="learning-roadmap-heading" className="font-semibold tracking-tight text-ink">Learning roadmap</h3><p className="mt-1 text-xs text-ink-muted">Recommendations returned for this analysis.</p></div></div><div className="grid gap-3">{roadmap.map((step, index) => <Card as="article" key={`${step.week ?? 'week'}-${step.topic ?? index}`} className="p-5"><div className="flex flex-wrap items-start justify-between gap-2"><h4 className="font-semibold text-ink">{step.topic || `Roadmap item ${index + 1}`}</h4>{step.week !== undefined && <Badge tone="violet">Week {step.week}</Badge>}</div>{Array.isArray(step.skills_to_learn) && step.skills_to_learn.length > 0 && <div className="mt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-subtle">Skills to learn</p><div className="flex flex-wrap gap-1.5">{step.skills_to_learn.map((skill, skillIndex) => <Badge key={`${skillIndex}-${skill}`}>{skill}</Badge>)}</div></div>}{Array.isArray(step.tasks) && step.tasks.length > 0 && <ul className="mt-4 grid gap-2">{step.tasks.map((task, taskIndex) => <li key={`${taskIndex}-${task}`} className="flex items-start gap-2.5 text-sm leading-6 text-ink-secondary"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />{task}</li>)}</ul>}</Card>)}</div></section>
  }

  return <div>
    <header className="mb-7 sm:mb-9"><Badge tone="violet"><Target size={12} className="mr-1" aria-hidden="true" />Career growth</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Skill gap analysis</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">Compare skills from a completed resume analysis with the requirements for a job role.</p></header>

    <Card className="mb-5 p-5 sm:p-6"><div className="mb-5"><h2 className="font-semibold tracking-tight text-ink">Choose what to compare</h2><p className="mt-1 text-sm text-ink-muted">The service compares your analyzed technical skills with a role’s required skills.</p></div>
      {choicesError ? <ErrorState title="Could not load choices" message={choicesError} onRetry={loadChoices} /> : loadingChoices ? <div className="grid gap-4 md:grid-cols-2"><LoadingSkeleton className="h-14" /><LoadingSkeleton className="h-14" /></div> : <form id="skill-gap-analysis-form" onSubmit={submitAnalysis}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-ink-secondary" htmlFor="skill-gap-resume">Analyzed resume<select id="skill-gap-resume" value={resumeId} onChange={(event) => selectResume(event.target.value)} className="min-h-12 w-full rounded-control border border-border-strong/80 bg-surface px-4 text-sm font-normal text-ink outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="">Choose a completed resume</option>{readyResumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.filename || 'Resume'}{typeof resume.resume_score === 'number' ? ` · Score ${resume.resume_score}` : ''}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold text-ink-secondary" htmlFor="skill-gap-job">Job role<select id="skill-gap-job" value={jobId} onChange={(event) => { setJobId(event.target.value); setResult(null); setAnalysisError('') }} className="min-h-12 w-full rounded-control border border-border-strong/80 bg-surface px-4 text-sm font-normal text-ink outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="">Choose a job role</option>{usableJobs.map((job) => <option key={job.id} value={job.id}>{job.title}{job.category ? ` · ${job.category}` : ''}</option>)}</select></label>
        </div>
        <div className="mt-3 flex min-h-6 flex-wrap items-center gap-2 text-xs text-ink-muted" aria-live="polite">{resumeSkillsState === 'loading' && 'Checking that the resume has analyzed technical skills…'}{resumeSkillsState === 'ready' && <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={14} />Resume analysis includes technical skills.</span>}{resumeSkillsState === 'missing' && <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><AlertCircle size={14} />This resume needs a completed analysis with technical skills.</span>}{resumeSkillsState === 'error' && <><span className="text-rose-700 dark:text-rose-300">{resumeSkillsError}</span><Button type="button" size="sm" variant="outline" onClick={() => selectResume(resumeId)}>Retry resume check</Button></>}</div>
        {readyResumes.length === 0 && <p className="mt-3 rounded-control border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">A completed resume analysis is required. <Link to="/dashboard/resume-analyzer" className="font-semibold underline underline-offset-2">Open Resume Analyzer</Link></p>}
        {usableJobs.length === 0 && <p className="mt-3 rounded-control border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">A job with required skills is needed for comparison. <Link to="/dashboard/jobs" className="font-semibold underline underline-offset-2">Browse job roles</Link></p>}
        {(analysisError || (resumeSkillsState === 'error' && resumeSkillsError)) && <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-control border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"><span>{analysisError || resumeSkillsError}</span>{canRetryAnalysis && <Button type="submit" size="sm" variant="outline" disabled={submitting}>Retry</Button>}</div>}
        <div className="mt-5 flex justify-end"><Button type="submit" loading={submitting} disabled={loadingChoices || !readyResumes.length || !usableJobs.length || resumeSkillsState !== 'ready'}><Sparkles size={16} />Analyze skill gap</Button></div>
      </form>}
      <p className="mt-5 border-t border-border-soft pt-4 text-xs leading-5 text-ink-subtle">This backend exposes an analysis request but no skill-gap history/list endpoint. Results are shown for the current page session.</p>
    </Card>

    {analysis && <section aria-labelledby="skill-analysis-results-heading" className="mt-7"><div className="mb-4"><Badge tone="success">Analysis complete</Badge><h2 id="skill-analysis-results-heading" className="mt-3 text-2xl font-semibold tracking-tight text-ink">{result.job_title || 'Skill comparison'}</h2>{result.analysis_id && <p className="mt-1 text-xs text-ink-subtle">Analysis reference: {result.analysis_id}</p>}</div>
      {score !== null && <Card className="mb-4 p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-blue-100 text-brand-700 dark:from-brand-900/60 dark:to-blue-950/60 dark:text-brand-200"><Target size={22} aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-4"><div><h3 className="font-semibold text-ink">Skill match score</h3><p className="mt-1 text-sm text-ink-muted">Percentage of required skills already matched.</p></div><p className="font-display text-3xl font-semibold tracking-tight text-ink">{score}<span className="text-base font-medium text-ink-muted">%</span></p></div><div role="progressbar" aria-label="Skill match score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} className="mt-4 h-2 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-950"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-electric-500" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div></div></div></Card>}
      {analysis.analysis && <Card className="mb-4 p-5 sm:p-6"><h3 className="mb-2 flex items-center gap-2 font-semibold text-ink"><Sparkles size={16} className="text-brand-600 dark:text-brand-300" />Analysis</h3><p className="whitespace-pre-line text-sm leading-7 text-ink-secondary">{analysis.analysis}</p></Card>}
      <div className="grid gap-4 xl:grid-cols-3"><ResultList title="Matched skills" values={analysis.matched_skills} icon={CheckCircle2} tone="green" /><ResultList title="Missing skills" values={analysis.missing_skills} icon={Search} tone="amber" /><ResultList title="Additional skills" values={analysis.additional_skills} icon={ListChecks} /></div>
      {renderRoadmap()}
      <div className="mt-5"><ResultList title="Recommendations" values={analysis.recommendations} icon={Lightbulb} /></div>
    </section>}

    {!analysis && !loadingChoices && !choicesError && !result && <Card className="mt-5"><EmptyState title="Choose a resume and job to begin" description="The result will show only the analysis fields returned by the AI skills service." icon={Target} /></Card>}
    {result && !analysis && <Card className="mt-5"><EmptyState title="No analysis details were returned" description="The request completed, but the response did not include an analysis object." icon={AlertCircle} /></Card>}
  </div>
}
