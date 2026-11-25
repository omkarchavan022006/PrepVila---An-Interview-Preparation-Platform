import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Award, CheckCircle2, ClipboardList, FileText, Lightbulb, Search, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { analyzeResume, getResume } from '../../api/resumeApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'

function getErrorMessage(error) {
  return error.response?.data?.error || error.response?.data?.detail || 'Could not load this resume. Please try again.'
}

function formatDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function ResultSection({ title, values, icon: Icon = ClipboardList, tone = 'violet' }) {
  if (!Array.isArray(values) || values.length === 0) return null
  const styles = tone === 'green'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
      : 'border-brand-100 bg-brand-50/70 text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200'
  return <Card as="article" className="p-5 sm:p-6"><div className="mb-4 flex items-center gap-2.5"><span className={`grid size-8 place-items-center rounded-xl border ${styles}`}><Icon size={16} aria-hidden="true" /></span><h2 className="font-semibold tracking-tight text-ink">{title}</h2></div><ul className="grid gap-2.5">{values.map((value, index) => <li key={`${index}-${value}`} className="flex items-start gap-2.5 text-sm leading-6 text-ink-secondary"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />{value}</li>)}</ul></Card>
}

function TextSection({ title, children, icon: Icon = ClipboardList }) {
  if (typeof children !== 'string' || !children.trim()) return null
  return <Card as="article" className="p-5 sm:p-6"><div className="mb-3 flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-300"><Icon size={16} aria-hidden="true" /></span><h2 className="font-semibold tracking-tight text-ink">{title}</h2></div><p className="whitespace-pre-line text-sm leading-7 text-ink-secondary">{children}</p></Card>
}

export default function ResumeDetailPage() {
  const { resumeId } = useParams()
  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  const loadResume = useCallback(async () => {
    try {
      const { data } = await getResume(resumeId)
      setError('')
      setResume(data)
      return true
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      return false
    } finally {
      setLoading(false)
    }
  }, [resumeId])

  useEffect(() => {
    let active = true
    getResume(resumeId)
      .then(({ data }) => {
        if (!active) return
        setError('')
        setResume(data)
      })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [resumeId])

  async function handleRetry() {
    setLoading(true)
    setError('')
    await loadResume()
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      const { data } = await analyzeResume(resumeId)
      setResume((current) => current ? {
        ...current,
        analysis: data?.analysis ?? current.analysis,
        analysis_status: data?.analysis_status ?? current.analysis_status,
        analyzed_at: data?.analyzed_at ?? current.analyzed_at,
      } : current)
      toast.success(data?.message || 'Resume analysis completed.')
      if (!data?.analysis) await loadResume()
    } catch (requestError) {
      toast.error(getErrorMessage(requestError))
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) return <div>
    <Link to="/dashboard/resume-analyzer" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:hover:text-brand-300"><ArrowLeft size={16} />Back to Resume Analyzer</Link>
    <LoadingSkeleton className="h-28" /><div className="mt-5 grid gap-4 md:grid-cols-2"><LoadingSkeleton className="h-44" /><LoadingSkeleton className="h-44" /></div>
  </div>

  if (error) return <div><Link to="/dashboard/resume-analyzer" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-brand-700"><ArrowLeft size={16} />Back to Resume Analyzer</Link><Card><ErrorState title="Resume details unavailable" message={error} onRetry={handleRetry} /></Card></div>

  const analysis = resume?.analysis && typeof resume.analysis === 'object' ? resume.analysis : null
  const score = typeof analysis?.resume_score === 'number' ? analysis.resume_score : null
  const createdAt = formatDate(resume?.created_at)
  const analyzedAt = formatDate(resume?.analyzed_at)

  return <div>
    <Link to="/dashboard/resume-analyzer" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:hover:text-brand-300"><ArrowLeft size={16} />Back to Resume Analyzer</Link>
    <Card className="mb-5 overflow-hidden p-0"><div className="relative p-5 sm:p-7"><div aria-hidden="true" className="absolute -right-14 -top-16 size-48 rounded-full bg-brand-200/30 blur-3xl dark:bg-brand-700/10" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-blue-50 text-brand-700 dark:border-brand-900 dark:from-brand-950 dark:to-blue-950/50 dark:text-brand-200"><FileText size={24} aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="break-words font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{resume?.filename || 'Resume details'}</h1>{resume?.analysis_status && <Badge tone={resume.analysis_status === 'completed' ? 'success' : resume.analysis_status === 'failed' ? 'danger' : 'warning'} className="capitalize">{String(resume.analysis_status).replaceAll('_', ' ')}</Badge>}</div><p className="mt-2 text-sm text-ink-muted">{createdAt ? `Uploaded ${createdAt}` : 'Upload date unavailable'}{analyzedAt ? ` · Analyzed ${analyzedAt}` : ''}</p></div>{!analysis && <Button loading={analyzing} onClick={handleAnalyze}><Search size={16} />Analyze resume</Button>}</div></div></Card>

    {analysis ? <>
      {score !== null && <Card className="mb-5 overflow-hidden p-5 sm:p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-100 to-blue-100 text-brand-700 dark:from-brand-900/60 dark:to-blue-950/60 dark:text-brand-200"><Award size={22} aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex items-baseline justify-between gap-4"><div><h2 className="font-semibold tracking-tight text-ink">Resume score</h2><p className="mt-1 text-sm text-ink-muted">Score returned by the resume analysis.</p></div><p className="font-display text-3xl font-semibold tracking-tight text-ink">{score}<span className="text-base font-medium text-ink-muted">/100</span></p></div><div role="progressbar" aria-label="Resume score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} className="mt-4 h-2 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-950"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-electric-500" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div></div></div></Card>}

      <div className="grid gap-4 xl:grid-cols-2">
        <TextSection title="Candidate summary" icon={Sparkles}>{analysis.candidate_summary}</TextSection>
        <TextSection title="Experience analysis" icon={ClipboardList}>{analysis.experience_analysis}</TextSection>
        <TextSection title="Overall feedback" icon={Lightbulb}>{analysis.overall_feedback}</TextSection>
        <ResultSection title="Technical skills" values={analysis.technical_skills} icon={CheckCircle2} tone="green" />
        <ResultSection title="Soft skills" values={analysis.soft_skills} icon={CheckCircle2} tone="green" />
        <ResultSection title="Strengths" values={analysis.strengths} icon={CheckCircle2} tone="green" />
        <ResultSection title="Areas to improve" values={analysis.weaknesses} icon={Lightbulb} tone="amber" />
        <ResultSection title="Missing skills" values={analysis.missing_skills} icon={Search} tone="amber" />
        <ResultSection title="Improvement suggestions" values={analysis.improvement_suggestions} icon={Lightbulb} />
        <ResultSection title="Recommended job roles" values={analysis.recommended_job_roles} icon={Sparkles} />
      </div>
      {typeof resume?.extracted_text === 'string' && resume.extracted_text.trim() && <details className="mt-5 rounded-card border border-border-soft bg-surface p-5 shadow-card"><summary className="cursor-pointer text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60">View extracted resume text</summary><pre className="mt-4 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words border-t border-border-soft pt-4 font-sans text-xs leading-6 text-ink-muted">{resume.extracted_text}</pre></details>}
    </> : <Card><EmptyState title="This resume has not been analyzed yet" description="Start an analysis to receive the score and feedback returned by the resume service." icon={FileText} action={<Button loading={analyzing} onClick={handleAnalyze}><Search size={16} />Analyze resume</Button>} /></Card>}
  </div>
}
