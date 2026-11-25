import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronLeft, CircleHelp, Clock3, Send, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { completeInterview, getInterview, getNextInterviewQuestion, submitInterviewAnswer } from '../../api/interviewsApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import Textarea from '../../components/common/Textarea'
import { getInterviewError, isUncertainRequest } from './interviewUtils'

function Feedback({ evaluation }) {
  if (!evaluation) return null
  return <Card className="mt-5 border-brand-200/80 bg-gradient-to-br from-brand-50/70 to-surface dark:from-brand-950/30 dark:to-surface">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Badge tone="violet"><Sparkles size={12} className="mr-1" />AI feedback</Badge><h2 className="mt-3 text-lg font-semibold text-ink">Your answer evaluation</h2></div>{typeof evaluation.score === 'number' && <div className="rounded-card border border-brand-200 bg-surface px-4 py-2 text-center dark:border-brand-800"><p className="text-2xl font-bold text-brand-700 dark:text-brand-200">{evaluation.score}<span className="text-sm font-medium text-ink-muted">/100</span></p>{evaluation.rating && <p className="text-xs font-medium text-ink-muted">{evaluation.rating}</p>}</div>}</div>
    {evaluation.feedback && <p className="mt-4 text-sm leading-7 text-ink-secondary">{evaluation.feedback}</p>}
    <div className="mt-4 grid gap-4 sm:grid-cols-2">{Array.isArray(evaluation.strengths) && evaluation.strengths.length > 0 && <section><h3 className="text-sm font-semibold text-ink">Strengths</h3><ul className="mt-2 grid gap-2">{evaluation.strengths.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-sm leading-6 text-ink-muted"><CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-600" />{item}</li>)}</ul></section>}{Array.isArray(evaluation.improvements) && evaluation.improvements.length > 0 && <section><h3 className="text-sm font-semibold text-ink">Areas to improve</h3><ul className="mt-2 grid gap-2">{evaluation.improvements.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2 text-sm leading-6 text-ink-muted"><ArrowRight size={16} className="mt-1 shrink-0 text-brand-600" />{item}</li>)}</ul></section>}</div>
    {evaluation.ideal_answer && <details className="mt-5 rounded-control border border-border-soft bg-surface px-4 py-3"><summary className="cursor-pointer text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60">View an improved answer</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink-muted">{evaluation.ideal_answer}</p></details>}
  </Card>
}

export default function MockInterviewSessionPage() {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const [uncertainAction, setUncertainAction] = useState('')
  const [pendingRetryAction, setPendingRetryAction] = useState('')
  const [uncertainQuestion, setUncertainQuestion] = useState(0)
  const [retryAllowed, setRetryAllowed] = useState(false)

  const refreshInterview = useCallback(async ({ showBusy = true } = {}) => {
    try {
      const { data } = await getInterview(interviewId)
      setInterview(data)
      setLoadError('')
      const current = Array.isArray(data?.questions) ? data.questions[data.current_question_number - 1] : null
      setAnswer(current?.user_answer || '')
      return data
    } catch (error) {
      const message = getInterviewError(error)
      if (showBusy) setLoadError(message)
      return null
    } finally {
      if (showBusy) setLoading(false)
    }
  }, [interviewId])

  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void refreshInterview() }); return () => { active = false } }, [refreshInterview])

  const questions = useMemo(() => Array.isArray(interview?.questions) ? interview.questions : [], [interview?.questions])
  const current = useMemo(() => questions[Number(interview?.current_question_number || 1) - 1], [questions, interview?.current_question_number])
  const evaluated = Boolean(current?.evaluation)
  const currentNumber = Number(interview?.current_question_number || 1)
  const total = Number(interview?.total_questions || 0)

  async function runAction(action, task, onSuccess) {
    if (busy || uncertainAction) return
    setBusy(action)
    setActionError('')
    setRetryAllowed(false)
    try {
      const response = await task()
      setUncertainAction('')
      onSuccess?.(response.data)
      await refreshInterview({ showBusy: false })
      return true
    } catch (error) {
      const message = getInterviewError(error)
      setActionError(message)
      if (isUncertainRequest(error)) {
        setUncertainAction(action)
        setUncertainQuestion(currentNumber)
        setRetryAllowed(false)
        await reconcile(action)
      } else {
        setRetryAllowed(['answer', 'next', 'complete'].includes(action) && error.response?.status !== 401)
      }
      toast.error(message)
      return false
    } finally {
      setBusy('')
    }
  }

  async function reconcile(action) {
    const data = await refreshInterview({ showBusy: false })
    if (!data) {
      setActionError('The result is still unknown. Check the session again before retrying.')
      return
    }
    const list = Array.isArray(data.questions) ? data.questions : []
    const index = Number(data.current_question_number || 1) - 1
    const item = list[index]
    const resolved = action === 'answer' ? Boolean(item?.evaluation) : action === 'next' ? Number(data.current_question_number) > uncertainQuestion : data.status === 'completed'
    if (resolved) {
      setUncertainAction('')
      setPendingRetryAction('')
      setActionError('The server completed that action. Your session has been updated.')
      setRetryAllowed(false)
      toast.success('Interview status updated.')
      if (action === 'complete') navigate(`/dashboard/interviews/${encodeURIComponent(interviewId)}`, { replace: true })
    } else {
      setUncertainAction('')
      setPendingRetryAction(action)
      if (action === 'answer') setAnswer(answer)
      setActionError('The session does not show that action as completed yet. You may retry it when you are ready.')
      setRetryAllowed(true)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!answer.trim()) { setActionError('Write an answer before submitting.'); return }
    await runAction('answer', () => submitInterviewAnswer(interviewId, answer.trim()), (data) => {
      if (data?.evaluation) setInterview((previous) => {
        if (!previous || !Array.isArray(previous.questions)) return previous
        const index = Number(data.question_number || previous.current_question_number) - 1
        const questionsUpdated = [...previous.questions]
        questionsUpdated[index] = { ...questionsUpdated[index], user_answer: answer.trim(), evaluation: data.evaluation }
        return { ...previous, questions: questionsUpdated }
      })
    })
  }

  async function handleNext() {
    const succeeded = await runAction('next', () => getNextInterviewQuestion(interviewId), (data) => {
      if (data?.question?.question && data?.current_question_number) setInterview((previous) => {
        if (!previous || !Array.isArray(previous.questions)) return previous
        const list = previous.questions.slice(0, Number(data.current_question_number) - 1)
        list.push({ question: data.question.question, topic: data.question.topic || '', user_answer: null, evaluation: null })
        return { ...previous, current_question_number: data.current_question_number, questions: list }
      })
    })
    if (succeeded) setAnswer('')
  }

  async function handleComplete() {
    if (!window.confirm('Complete this interview and open your session results?')) return
    setBusy('complete')
    setActionError('')
    try {
      const { data } = await completeInterview(interviewId)
      toast.success('Interview completed.')
      navigate(`/dashboard/interviews/${encodeURIComponent(interviewId)}`, { replace: true, state: { completion: data } })
    } catch (error) {
      const message = getInterviewError(error)
      setActionError(message)
      if (isUncertainRequest(error)) { setUncertainAction('complete'); await reconcile('complete') }
      else setRetryAllowed(error.response?.status !== 401)
      toast.error(message)
    } finally { setBusy('') }
  }

  if (loading) return <div className="grid gap-5"><LoadingSkeleton className="h-24" /><Card><LoadingSkeleton className="h-6 w-1/2" /><LoadingSkeleton className="mt-6 h-36 w-full" /><LoadingSkeleton className="mt-5 h-36 w-full" /></Card></div>
  if (loadError) return <Card><ErrorState title="Interview session unavailable" message={loadError} onRetry={() => refreshInterview()} /></Card>
  if (!interview || !current) return <Card><ErrorState title="Interview session could not be displayed" message="The server response did not include the current interview question." onRetry={() => refreshInterview()} /></Card>
  if (interview.status === 'completed') return <Card><div className="mx-auto max-w-lg py-8 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={44} /><h1 className="mt-4 text-2xl font-semibold text-ink">Interview completed</h1><p className="mt-2 text-sm text-ink-muted">Your session results are ready to review.</p><Button className="mt-5" as={Link} to={`/dashboard/interviews/${encodeURIComponent(interviewId)}`}>View results</Button></div></Card>

  return <div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Button as={Link} to="/dashboard/interviews" variant="ghost" size="sm"><ChevronLeft size={16} />Exit session</Button><Badge tone="info"><span className="mr-1.5 size-1.5 rounded-full bg-blue-500" />In progress</Badge></div>
    <header className="mb-5"><p className="text-sm font-medium text-brand-700 dark:text-brand-300">{interview.job_title} · {interview.difficulty}</p><h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Mock interview</h1></header>
    <div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-ink">Question {currentNumber} <span className="font-normal text-ink-muted">of {total}</span></p><div className="mt-2 h-1.5 w-48 max-w-[55vw] overflow-hidden rounded-full bg-brand-100 dark:bg-brand-950"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-blue-500" style={{ width: `${total ? (currentNumber / total) * 100 : 0}%` }} /></div></div><span className="flex items-center gap-1.5 text-xs text-ink-muted"><Clock3 size={14} />Your pace</span></div>
    <Card className="p-5 sm:p-8"><div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><CircleHelp size={20} /></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">{current.topic || 'Interview question'}</p><h2 className="mt-3 whitespace-pre-wrap text-lg font-semibold leading-8 text-ink sm:text-xl">{current.question}</h2></div></div>
      {evaluated ? <div className="mt-6 rounded-card border border-border-soft bg-surface-muted/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Your submitted answer</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink-secondary">{current.user_answer}</p></div> : <form onSubmit={handleSubmit} className="mt-6"><Textarea label="Your answer" value={answer} onChange={(event) => { setAnswer(event.target.value); setActionError('') }} placeholder="Write your response in your own words…" rows={7} disabled={Boolean(busy)} hint="Your answer is sent to the interview service for evaluation." /><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-ink-muted">Take a moment to organize your thoughts.</p><Button type="submit" loading={busy === 'answer'} disabled={!answer.trim() || Boolean(busy) || Boolean(uncertainAction)}><Send size={15} />Submit answer</Button></div></form>}
    </Card>
    {evaluated && <Feedback evaluation={current.evaluation} />}
    {actionError && <div role="status" className={`mt-4 rounded-control border px-4 py-3 text-sm ${uncertainAction || pendingRetryAction ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100' : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'}`}><div className="flex items-start gap-2"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><div><p>{actionError}</p>{(uncertainAction || pendingRetryAction) && <div className="mt-3 flex flex-wrap gap-2">{uncertainAction && <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => reconcile(uncertainAction)}>Check session status</Button>}{pendingRetryAction && retryAllowed && <Button variant="outline" size="sm" disabled={Boolean(busy)} onClick={() => { const action = pendingRetryAction; setPendingRetryAction(''); setRetryAllowed(false); setActionError(''); if (action === 'answer') handleSubmit(); else if (action === 'next') handleNext(); else handleComplete() }}>Retry action</Button>}</div>}</div></div></div>}
    {evaluated && !uncertainAction && <div className="mt-5 flex flex-wrap justify-end gap-3">{currentNumber < total ? <Button loading={busy === 'next'} disabled={Boolean(busy)} onClick={handleNext}>Next question<ArrowRight size={16} /></Button> : <Button loading={busy === 'complete'} disabled={Boolean(busy)} onClick={handleComplete}><CheckCircle2 size={16} />Complete interview</Button>}</div>}
  </div>
}
