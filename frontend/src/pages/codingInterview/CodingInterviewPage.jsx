import { useState } from 'react'
import { ArrowRight, Braces, CheckCircle2, CircleAlert, Code2, Lightbulb, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { generateCodingQuestion, submitCodingSolution } from '../../api/codingInterviewApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import Textarea from '../../components/common/Textarea'
import { apiError, codingLanguages, hasUncertainOutcome } from './codingInterviewUtils'

function Evaluation({ data }) {
  if (!data || typeof data !== 'object') return null
  const fields = [
    ['Correctness', data.correctness], ['Logic', data.logic], ['Time complexity', data.time_complexity],
    ['Space complexity', data.space_complexity], ['Code quality', data.code_quality], ['Overall feedback', data.overall_feedback],
  ].filter(([, value]) => typeof value === 'string' && value)
  return <section aria-live="polite" className="mt-6 grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Badge tone="success"><CheckCircle2 size={13} className="mr-1" />AI evaluation received</Badge><h2 className="mt-2 text-xl font-semibold text-ink">Submission feedback</h2></div>{typeof data.score === 'number' && <div className="rounded-card border border-brand-100 bg-brand-50 px-4 py-2 text-center dark:border-brand-900 dark:bg-brand-950/40"><p className="text-2xl font-bold text-brand-700 dark:text-brand-200">{data.score}<span className="text-sm font-medium text-ink-muted">/100</span></p><p className="text-xs text-ink-muted">AI assessment</p></div>}</div>
    {typeof data.verdict === 'string' && <Badge tone="violet">{data.verdict}</Badge>}
    {fields.length > 0 && <div className="grid gap-3 md:grid-cols-2">{fields.map(([label, value]) => <Card key={label} className="p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{label}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{value}</p></Card>)}</div>}
    {Array.isArray(data.bugs) && <Card className="p-4"><h3 className="flex items-center gap-2 font-semibold text-ink"><CircleAlert size={16} />Potential issues</h3>{data.bugs.length ? <ul className="mt-3 grid gap-2">{data.bugs.map((item, index) => <li key={`${index}-${item}`} className="text-sm leading-6 text-ink-muted">{item}</li>)}</ul> : <p className="mt-2 text-sm text-ink-muted">No potential issues were returned.</p>}</Card>}
    {Array.isArray(data.suggestions) && data.suggestions.length > 0 && <Card className="p-4"><h3 className="font-semibold text-ink">Suggestions</h3><ul className="mt-3 grid gap-2">{data.suggestions.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-sm leading-6 text-ink-muted"><Lightbulb size={15} className="mt-1 shrink-0 text-brand-600 dark:text-brand-300" />{item}</li>)}</ul></Card>}
  </section>
}

export default function CodingInterviewPage() {
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [language, setLanguage] = useState('python')
  const [questionRecord, setQuestionRecord] = useState(null)
  const [code, setCode] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [questionError, setQuestionError] = useState('')
  const [generationUncertain, setGenerationUncertain] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [historyChecked, setHistoryChecked] = useState(false)

  async function handleGenerate(event) {
    event.preventDefault()
    if (generating || generationUncertain) return
    setGenerating(true)
    setQuestionError('')
    try {
      const payload = { topic: topic.trim() || 'Python', difficulty, programming_language: language }
      const { data } = await generateCodingQuestion(payload)
      setQuestionRecord(data)
      setCode(data?.question?.starter_code || '')
      setEvaluation(null)
      setSubmissionError('')
      setUncertain(false)
      setGenerationUncertain(false)
      toast.success('Coding question generated.')
    } catch (error) {
      setQuestionError(apiError(error, true))
      if (hasUncertainOutcome(error)) setGenerationUncertain(true)
    }
    finally { setGenerating(false) }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!questionRecord?.question_id || !code.trim() || submitting || (uncertain && !historyChecked)) return
    setSubmitting(true)
    setSubmissionError('')
    setEvaluation(null)
    setHistoryChecked(false)
    try {
      const { data } = await submitCodingSolution({ question_id: questionRecord.question_id, programming_language: questionRecord.programming_language, submitted_code: code })
      setEvaluation(data)
      toast.success('AI static evaluation completed.')
    } catch (error) {
      setSubmissionError(apiError(error, true))
      if (hasUncertainOutcome(error)) setUncertain(true)
    } finally { setSubmitting(false) }
  }

  const question = questionRecord?.question
  return <div>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><Badge tone="violet"><Braces size={13} className="mr-1" />Practice workspace</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">AI Coding Interview</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Generate a coding problem and receive AI feedback on your submitted solution. Submitted code is analyzed, not executed.</p></div><Button as={Link} to="/dashboard/coding-interview/history" variant="outline">Submission history<ArrowRight size={15} /></Button></header>
    {!question && <Card className="mb-5 p-5 sm:p-6"><div className="mb-5"><h2 className="text-lg font-semibold text-ink">Configure a question</h2><p className="mt-1 text-sm text-ink-muted">Questions are generated by the backend AI using these supported settings.</p></div><form onSubmit={handleGenerate} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_auto] xl:items-end">
      <div className="grid gap-2"><label htmlFor="coding-topic" className="text-sm font-semibold text-ink-secondary">Topic</label><input id="coding-topic" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={100} placeholder="Optional (backend default: Python)" className="min-h-11 rounded-control border border-border-strong/80 bg-surface px-3 text-sm text-ink outline-none placeholder:text-ink-muted/70 focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40" /></div>
      <div className="grid gap-2"><label htmlFor="coding-difficulty" className="text-sm font-semibold text-ink-secondary">Difficulty</label><select id="coding-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="min-h-11 rounded-control border border-border-strong/80 bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40">{['easy', 'medium', 'hard'].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></div>
      <div className="grid gap-2"><label htmlFor="coding-language" className="text-sm font-semibold text-ink-secondary">Programming language</label><select id="coding-language" value={language} onChange={(event) => setLanguage(event.target.value)} className="min-h-11 rounded-control border border-border-strong/80 bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40">{codingLanguages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <Button type="submit" loading={generating} disabled={generationUncertain}><Sparkles size={16} />Generate problem</Button>
    </form>{questionError && <div role="alert" className="mt-4 rounded-control border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200"><p>{questionError}</p>{generationUncertain && <><p className="mt-2">The request may have saved a generated question. The backend does not provide a generated-question history endpoint, so its result cannot be reconciled here. Generating again may create another saved question.</p><Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => { setGenerationUncertain(false); setQuestionError('') }}>I understand; allow a new generation</Button></>}</div>}</Card>}
    {!question && !questionError && <Card><EmptyState icon={Code2} title="Ready when you are" description="Choose a topic, difficulty, and language to request a real question from the AI service." /></Card>}
    {question && <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><Badge>{questionRecord.difficulty} · {questionRecord.programming_language}</Badge><h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{question.title}</h2><p className="mt-1 text-sm text-ink-muted">Topic: {questionRecord.topic}</p></div><Button variant="outline" onClick={() => { setQuestionRecord(null); setEvaluation(null); setSubmissionError(''); setUncertain(false) }}>New question</Button></div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.92fr)]">
        <div className="grid gap-4"><Card className="p-5 sm:p-6"><h3 className="font-semibold text-ink">Problem</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-secondary">{question.description}</p><div className="mt-5 grid gap-4 sm:grid-cols-2">{question.input_format && <div><h4 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Input</h4><p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{question.input_format}</p></div>}{question.output_format && <div><h4 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Output</h4><p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{question.output_format}</p></div>}</div>{Array.isArray(question.constraints) && question.constraints.length > 0 && <div className="mt-5"><h4 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Constraints</h4><ul className="mt-2 grid gap-1.5">{question.constraints.map((item, index) => <li key={`${index}-${item}`} className="font-mono text-xs leading-5 text-ink-muted">{item}</li>)}</ul></div>}</Card>
          {Array.isArray(question.examples) && question.examples.map((example, index) => <Card key={`${index}-${example.input}`} className="p-5"><h3 className="font-semibold text-ink">Example {index + 1}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><p className="text-xs font-semibold text-ink-subtle">Input</p><pre className="mt-1 overflow-x-auto rounded-control bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100">{example.input}</pre></div><div><p className="text-xs font-semibold text-ink-subtle">Output</p><pre className="mt-1 overflow-x-auto rounded-control bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100">{example.output}</pre></div></div>{example.explanation && <p className="mt-3 text-sm leading-6 text-ink-muted">{example.explanation}</p>}</Card>)}
          {Array.isArray(question.hints) && question.hints.length > 0 && <Card className="p-5"><h3 className="flex items-center gap-2 font-semibold text-ink"><Lightbulb size={17} className="text-amber-500" />Hints</h3><ul className="mt-3 grid gap-2">{question.hints.map((hint, index) => <li key={`${index}-${hint}`} className="text-sm leading-6 text-ink-muted">{hint}</li>)}</ul></Card>}
        </div>
        <div className="xl:sticky xl:top-24"><Card className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-semibold text-ink"><Code2 size={17} />Your solution</h3><p className="mt-1 text-xs text-ink-muted">{questionRecord.programming_language} · Plain text editor</p></div><Badge>{questionRecord.programming_language}</Badge></div><form onSubmit={handleSubmit}><Textarea label="Code" value={code} onChange={(event) => { setCode(event.target.value); setSubmissionError('') }} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" aria-label={`Solution code in ${questionRecord.programming_language}`} className="min-h-[22rem] resize-y bg-[#0e1020] font-mono text-xs leading-6 text-slate-100 placeholder:text-slate-500 focus:border-brand-400 focus:ring-brand-400/20" hint="Edit the generated starter code, then request an AI static evaluation." />{submissionError && <div role="alert" className="mt-3 rounded-control border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">{submissionError}{uncertain && <p className="mt-2 font-medium">The request may have been processed. Check submission history before making another submission.</p>}</div>}{uncertain && <div className="mt-3 grid gap-2"><Button as={Link} to="/dashboard/coding-interview/history" target="_blank" rel="noreferrer" variant="outline" size="sm" className="w-full">Review submission history<ArrowRight size={14} /></Button><Button type="button" variant="ghost" size="sm" onClick={() => setHistoryChecked(true)}>I checked history; allow another submission</Button></div>}<Button type="submit" loading={submitting} disabled={!code.trim() || submitting || (uncertain && !historyChecked)} className="mt-4 w-full"><Sparkles size={16} />Evaluate solution</Button></form><p className="mt-3 text-xs leading-5 text-ink-muted">AI static analysis only. The backend does not compile or execute submitted code.</p></Card></div>
      </div>
      {evaluation && <Evaluation data={evaluation.evaluation} />}
    </>}
  </div>
}
