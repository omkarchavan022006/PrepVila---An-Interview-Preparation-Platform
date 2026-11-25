import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clipboard, MessageCircleMore, Sparkles } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { getFollowupDetail, getFollowupHistory, generateFollowupQuestions } from '../../api/followupQuestionsApi'
import { getInterview, getInterviewHistory } from '../../api/interviewsApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { formatInterviewDate, getInterviewError } from '../interviews/interviewUtils'
import { getApiErrorMessage } from '../../utils/apiErrors'

function apiError(error, writeOperation = false) {
  return getApiErrorMessage(error, { writeOperation })
}

function Result({ result }) {
  if (!result || typeof result !== 'object') return <EmptyState icon={Sparkles} title="No result details were returned" description="This record does not contain a result payload." />
  const questions = Array.isArray(result.follow_up_questions) ? result.follow_up_questions : []
  return <div className="grid gap-4">
    {typeof result.analysis === 'string' && <Card className="p-5"><h3 className="font-semibold text-ink">Answer analysis</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{result.analysis}</p></Card>}
    {(Array.isArray(result.strengths) && result.strengths.length > 0 || Array.isArray(result.improvements) && result.improvements.length > 0) && <div className="grid gap-4 md:grid-cols-2">{Array.isArray(result.strengths) && result.strengths.length > 0 && <Card className="p-5"><h3 className="font-semibold text-ink">Strengths</h3><ul className="mt-3 grid gap-2">{result.strengths.map((item, index) => <li key={`${index}-${item}`} className="text-sm leading-6 text-ink-muted">{item}</li>)}</ul></Card>}{Array.isArray(result.improvements) && result.improvements.length > 0 && <Card className="p-5"><h3 className="font-semibold text-ink">Areas to improve</h3><ul className="mt-3 grid gap-2">{result.improvements.map((item, index) => <li key={`${index}-${item}`} className="text-sm leading-6 text-ink-muted">{item}</li>)}</ul></Card>}</div>}
    {questions.map((item, index) => <Card as="article" key={`${index}-${item.question}`} className="p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">Follow-up {index + 1}</p><h3 className="mt-2 text-lg font-semibold leading-7 text-ink">{item.question}</h3><div className="mt-4 grid gap-4">{['reason', 'ideal_answer', 'explanation', 'example'].map((field) => typeof item[field] === 'string' && item[field] ? <div key={field}><h4 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{field.replaceAll('_', ' ')}</h4><p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{item[field]}</p></div> : null)}</div></Card>)}
    {!questions.length && !result.analysis && !result.strengths?.length && !result.improvements?.length && <EmptyState icon={Sparkles} title="No follow-up content" description="No displayable result fields were returned for this record." />}
  </div>
}

export default function FollowupQuestionsPage() {
  const navigate = useNavigate()
  const { followupId } = useParams()
  const [history, setHistory] = useState([])
  const [interviews, setInterviews] = useState([])
  const [selectedInterview, setSelectedInterview] = useState(null)
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState('')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingInterviews, setLoadingInterviews] = useState(true)
  const [loadingInterview, setLoadingInterview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [interviewError, setInterviewError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [number, setNumber] = useState('3')
  const [uncertain, setUncertain] = useState(null)
  const [checkingOutcome, setCheckingOutcome] = useState(false)

  const loadHistory = useCallback(async () => {
    try { const { data } = await getFollowupHistory(); setHistory(Array.isArray(data?.history) ? data.history : []); setError('') }
    catch (requestError) { setError(apiError(requestError)) }
    finally { setLoading(false) }
  }, [])

  const loadInterviews = useCallback(async () => {
    try { const { data } = await getInterviewHistory(); setInterviews(Array.isArray(data?.history) ? data.history : []); setInterviewError('') }
    catch (requestError) { setInterviewError(getInterviewError(requestError)) }
    finally { setLoadingInterviews(false) }
  }, [])

  const loadDetail = useCallback(async () => {
    if (!followupId) { setDetail(null); return }
    setLoading(true)
    try { const { data } = await getFollowupDetail(followupId); setDetail(data); setDetailError('') }
    catch (requestError) { setDetailError(apiError(requestError)) }
    finally { setLoading(false) }
  }, [followupId])

  useEffect(() => { let active = true; queueMicrotask(() => { if (active) { void loadHistory(); void loadInterviews() } }); return () => { active = false } }, [loadHistory, loadInterviews])
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void loadDetail() }); return () => { active = false } }, [loadDetail])

  const answeredQuestions = useMemo(() => Array.isArray(selectedInterview?.questions) ? selectedInterview.questions.map((item, index) => ({ item, index })).filter(({ item }) => typeof item.question === 'string' && typeof item.user_answer === 'string' && item.user_answer.trim()) : [], [selectedInterview])
  const chosenQuestion = answeredQuestions.find(({ index }) => String(index) === selectedQuestionIndex)?.item

  async function chooseInterview(interviewId) {
    setSelectedInterview(null)
    setSelectedQuestionIndex('')
    if (!interviewId) return
    setLoadingInterview(true)
    try {
      const { data } = await getInterview(interviewId)
      setSelectedInterview(data)
      if (data?.difficulty && ['easy', 'medium', 'hard'].includes(data.difficulty)) setDifficulty(data.difficulty)
    } catch (requestError) { toast.error(getInterviewError(requestError)) }
    finally { setLoadingInterview(false) }
  }

  async function handleGenerate(event) {
    event.preventDefault()
    if (!selectedInterview || !chosenQuestion || submitting || uncertain) return
    setSubmitting(true)
    let attemptContext = null
    try {
      const { data: before } = await getFollowupHistory()
      const baselineIds = (Array.isArray(before?.history) ? before.history : []).map((item) => String(item.followup_id))
      const payload = {
        interview_id: selectedInterview.interview_id,
        question: chosenQuestion.question,
        candidate_answer: chosenQuestion.user_answer,
        job_title: selectedInterview.job_title,
        difficulty,
        number_of_followups: Number(number),
      }
      attemptContext = {
        interviewId: selectedInterview.interview_id,
        question: chosenQuestion.question,
        baselineIds,
      }
      const { data } = await generateFollowupQuestions({
        ...payload,
      })
      setDetail({ ...data, question: chosenQuestion.question, candidate_answer: chosenQuestion.user_answer, job_title: selectedInterview.job_title, difficulty })
      setUncertain(null)
      toast.success('Follow-up questions generated.')
      await loadHistory()
    } catch (requestError) {
      if (attemptContext && (!requestError?.response || requestError.response.status === 500 || requestError.response.status >= 504)) {
        setUncertain(attemptContext)
      }
      toast.error(apiError(requestError, true))
    }
    finally { setSubmitting(false) }
  }

  async function checkUncertainOutcome() {
    if (!uncertain || checkingOutcome) return
    setCheckingOutcome(true)
    try {
      const { data } = await getFollowupHistory()
      const matches = (Array.isArray(data?.history) ? data.history : []).filter((item) =>
        String(item.interview_id) === String(uncertain.interviewId)
        && item.question === uncertain.question
        && !uncertain.baselineIds.includes(String(item.followup_id)),
      )
      if (matches.length === 1) {
        setUncertain(null)
        navigate(`/dashboard/follow-up-questions/${encodeURIComponent(matches[0].followup_id)}`)
        toast.success('The saved analysis was found.')
      } else if (matches.length > 1) {
        toast.error('Multiple saved analyses match. Open history and choose the intended result before generating again.')
      } else {
        toast.error('No new analysis is visible yet. Check history again before retrying.')
      }
    } catch (requestError) { toast.error(apiError(requestError)) }
    finally { setCheckingOutcome(false) }
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast.success('Copied to clipboard.') }
    catch { toast.error('Clipboard access is unavailable in this browser.') }
  }

  if (followupId) return <div>
    <div className="mb-5 flex items-center justify-between gap-3"><Button as={Link} to="/dashboard/follow-up-questions" variant="ghost" size="sm"><ArrowLeft size={15} />Back to Follow-up Questions</Button>{detail?.created_at && <span className="text-xs text-ink-muted">{formatInterviewDate(detail.created_at)}</span>}</div>
    {loading ? <div className="grid gap-4"><LoadingSkeleton className="h-24" /><LoadingSkeleton className="h-56" /></div> : detailError ? <Card><ErrorState title="Follow-up details unavailable" message={detailError} onRetry={loadDetail} /></Card> : detail && <><header className="mb-6"><Badge tone="violet">Saved analysis</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">Follow-up questions</h1><p className="mt-2 text-sm text-ink-muted">{detail.job_title || 'Interview answer'}{detail.difficulty ? ` · ${detail.difficulty} difficulty` : ''}</p></header>{detail.question && <Card className="mb-4 p-5"><h2 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Original interview question</h2><p className="mt-2 font-medium leading-6 text-ink">{detail.question}</p>{detail.candidate_answer && <><h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-subtle">Your saved answer</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{detail.candidate_answer}</p></>}</Card>}<Result result={detail.result} /></>}
  </div>

  return <div>
    <header className="mb-7"><Badge tone="violet"><MessageCircleMore size={13} className="mr-1" />Interview practice</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Follow-up Questions</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Generate deeper practice questions from an answer saved in one of your mock interviews.</p></header>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
      <Card className="p-5 sm:p-6"><h2 className="text-lg font-semibold text-ink">Choose an answered question</h2><p className="mt-1 text-sm text-ink-muted">The backend requires the original interview answer, so the selected response is sent exactly as saved.</p>
        {interviewError ? <div className="mt-5"><ErrorState title="Interview history unavailable" message={interviewError} onRetry={loadInterviews} /></div> : loadingInterviews ? <div className="mt-5 grid gap-2">{[0, 1].map((n) => <LoadingSkeleton key={n} className="h-12" />)}</div> : interviews.length === 0 ? <div className="mt-5"><EmptyState icon={MessageCircleMore} title="No interview sessions found" description="Complete or answer questions in a mock interview, then return here to generate follow-ups." action={<Button as={Link} to="/dashboard/interviews" variant="outline">Open mock interviews</Button>} /></div> : <form onSubmit={handleGenerate} className="mt-5 grid gap-4">
          <div className="grid gap-2"><label htmlFor="followup-interview" className="text-sm font-semibold text-ink-secondary">Mock interview</label><select id="followup-interview" required defaultValue="" disabled={Boolean(uncertain) || submitting} onChange={(event) => void chooseInterview(event.target.value)} className="min-h-11 rounded-control border border-border-strong/80 bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="" disabled>Select an interview</option>{interviews.map((item) => <option key={item.interview_id} value={item.interview_id}>{item.job_title || 'Interview'} · {item.difficulty || 'Difficulty unavailable'} · {formatInterviewDate(item.created_at)}</option>)}</select></div>
          {loadingInterview && <LoadingSkeleton className="h-12" />}
          {selectedInterview && !loadingInterview && <>
            {answeredQuestions.length === 0 ? <div className="rounded-control border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">This interview has no saved answers available for follow-up generation.</div> : <div className="grid gap-2"><label htmlFor="followup-question" className="text-sm font-semibold text-ink-secondary">Answered question</label><select id="followup-question" required value={selectedQuestionIndex} onChange={(event) => setSelectedQuestionIndex(event.target.value)} className="min-h-11 rounded-control border border-border-strong/80 bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40"><option value="" disabled>Select a question with a saved answer</option>{answeredQuestions.map(({ item, index }) => <option key={`${index}-${item.question}`} value={String(index)}>{item.question}</option>)}</select></div>}
            {chosenQuestion && <div className="rounded-control border border-border-soft bg-surface-muted/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Saved answer sent for analysis</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-secondary">{chosenQuestion.user_answer}</p></div>}
          </>}
          <div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><label htmlFor="followup-difficulty" className="text-sm font-semibold text-ink-secondary">Follow-up difficulty</label><select id="followup-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="min-h-11 rounded-control border border-border-strong/80 bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40">{['easy', 'medium', 'hard'].map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></div><div className="grid gap-2"><label htmlFor="followup-count" className="text-sm font-semibold text-ink-secondary">Number of questions</label><select id="followup-count" value={number} onChange={(event) => setNumber(event.target.value)} className="min-h-11 rounded-control border border-border-strong/80 bg-surface px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40">{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}</select></div></div>
          {uncertain && <div role="status" className="grid gap-2 rounded-control border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><p>The generation outcome is uncertain. Review saved analyses before attempting another generation.</p><Button type="button" variant="outline" size="sm" disabled={checkingOutcome} loading={checkingOutcome} onClick={checkUncertainOutcome}>Check saved analyses</Button></div>}
          <Button type="submit" loading={submitting} disabled={!chosenQuestion || submitting || Boolean(uncertain)}><Sparkles size={16} />Generate follow-ups</Button>
        </form>}
      </Card>
      <Card className="p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-ink">Recent analyses</h2><p className="mt-1 text-sm text-ink-muted">Saved results from your follow-up practice.</p></div></div>
        {error ? <ErrorState title="History unavailable" message={error} onRetry={loadHistory} /> : loading ? <div className="mt-4 grid gap-2">{[0, 1, 2].map((n) => <LoadingSkeleton key={n} className="h-16" />)}</div> : history.length ? <div className="mt-4 divide-y divide-border-soft">{history.map((item) => <div key={item.followup_id} className="flex items-start gap-3 py-3"><div className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200"><MessageCircleMore size={15} /></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-medium leading-5 text-ink">{item.question}</p><p className="mt-1 text-xs text-ink-muted">{item.job_title || 'Interview'} · {item.difficulty || 'Difficulty unavailable'} · {formatInterviewDate(item.created_at)}</p><Link className="mt-1 inline-block text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300" to={`/dashboard/follow-up-questions/${encodeURIComponent(item.followup_id)}`}>View saved analysis</Link></div></div>)}</div> : <EmptyState icon={Sparkles} title="No analyses yet" description="Generated follow-up question sets will be saved here." />}
      </Card>
    </div>
    {detail && !followupId && <section className="mt-8" aria-live="polite"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><Badge tone="success">Generated result</Badge><h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Your follow-up practice</h2><p className="mt-1 text-sm text-ink-muted">{detail.job_title || 'Interview'} · {detail.difficulty}</p></div>{detail.result && <Button variant="outline" size="sm" onClick={() => copyText([detail.result.analysis, ...(detail.result.follow_up_questions || []).map((item) => [item.question, item.reason, item.ideal_answer, item.explanation, item.example].filter(Boolean).join('\n'))].filter(Boolean).join('\n\n'))}><Clipboard size={15} />Copy result</Button>}</div><Card className="mb-4 p-5"><h3 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">Original interview question</h3><p className="mt-2 font-medium leading-6 text-ink">{detail.question}</p><h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-ink-subtle">Your saved answer</h4><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{detail.candidate_answer}</p></Card><Result result={detail.result} /></section>}
  </div>
}
