import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, MessageSquarePlus, Send, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { deleteChatbotConversation, getChatbotConversation, getChatbotHistory, sendChatbotMessage } from '../../api/chatbotApi'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import Textarea from '../../components/common/Textarea'
import { getApiErrorMessage } from '../../utils/apiErrors'

function requestMessage(error, writeOperation = false) {
  return getApiErrorMessage(error, { writeOperation })
}

export default function ChatbotPage() {
  const [history, setHistory] = useState([])
  const [conversation, setConversation] = useState(null)
  const [draft, setDraft] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [uncertainRequest, setUncertainRequest] = useState(null)
  const [checkingOutcome, setCheckingOutcome] = useState(false)
  const [deleting, setDeleting] = useState('')
  const endRef = useRef(null)
  const composerRef = useRef(null)

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await getChatbotHistory()
      setHistory(Array.isArray(data?.history) ? data.history : [])
      setHistoryError('')
    } catch (error) { setHistoryError(requestMessage(error)) }
    finally { setLoadingHistory(false) }
  }, [])

  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void loadHistory() }); return () => { active = false } }, [loadHistory])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [conversation?.messages?.length, sending])

  async function openConversation(item) {
    setLoadingConversation(true)
    setSendError('')
    try {
      const { data } = await getChatbotConversation(item.conversation_id)
      setConversation(data)
    } catch (error) { toast.error(requestMessage(error)) }
    finally { setLoadingConversation(false) }
  }

  function startNewConversation() {
    if (uncertainRequest) return
    setConversation(null)
    setDraft('')
    setSendError('')
    composerRef.current?.focus()
  }

  async function handleSend(event) {
    event?.preventDefault()
    const message = draft.trim()
    if (!message || sending || uncertainRequest) return
    if (message.length > 10000) { setSendError('Messages can contain up to 10,000 characters.'); return }
    setSending(true)
    setSendError('')
    const startedAt = Date.now()
    const priorConversationId = conversation?.conversation_id || null
    const optimisticMessage = { role: 'user', content: message, created_at: new Date().toISOString() }
    setConversation((current) => current ? { ...current, messages: [...(current.messages || []), optimisticMessage] } : { conversation_id: null, title: message.slice(0, 80), messages: [optimisticMessage] })
    setDraft('')
    try {
      const payload = { message }
      if (conversation?.conversation_id) payload.conversation_id = conversation.conversation_id
      const { data } = await sendChatbotMessage(payload)
      setConversation((current) => ({
        conversation_id: data.conversation_id,
        title: current?.title || message.slice(0, 80),
        messages: [...(current?.messages || []).filter((item) => item !== optimisticMessage), data.user_message, data.assistant_message],
      }))
      setUncertainRequest(null)
      await loadHistory()
    } catch (error) {
      const messageText = requestMessage(error, true)
      setSendError(messageText)
      setConversation((current) => current ? { ...current, messages: (current.messages || []).filter((item) => item !== optimisticMessage) } : null)
      setDraft(message)
      if (!error?.response || error.response.status === 500 || error.response.status >= 504) {
        setUncertainRequest({ message, conversationId: priorConversationId, startedAt })
        setSendError('The server response was interrupted or failed after processing may have started. Check saved conversation history before sending this message again.')
      }
      await loadHistory()
    } finally { setSending(false) }
  }

  async function checkUncertainOutcome() {
    if (!uncertainRequest || checkingOutcome) return
    setCheckingOutcome(true)
    setSendError('Checking saved conversation history…')
    try {
      const { data } = await getChatbotHistory()
      const items = Array.isArray(data?.history) ? data.history : []
      setHistory(items)
      const minTime = uncertainRequest.startedAt - 120000
      const candidates = items.filter((item) => {
        if (uncertainRequest.conversationId && item.conversation_id !== uncertainRequest.conversationId) return false
        const updatedAt = Date.parse(item.updated_at)
        if (!Number.isFinite(updatedAt) || updatedAt < minTime) return false
        return Array.isArray(item.messages) && item.messages.some((message) => message.role === 'user' && message.content === uncertainRequest.message)
      })
      const verified = []
      for (const item of candidates) {
        const { data: fullConversation } = await getChatbotConversation(item.conversation_id)
        const messages = Array.isArray(fullConversation?.messages) ? fullConversation.messages : []
        const savedPair = messages.some((message, index) =>
          message.role === 'user'
          && message.content === uncertainRequest.message
          && messages[index + 1]?.role === 'assistant'
          && typeof messages[index + 1]?.content === 'string'
          && messages[index + 1].content.trim(),
        )
        if (savedPair) verified.push(fullConversation)
      }
      if (verified.length === 1) {
        setConversation(verified[0])
        setDraft('')
        setUncertainRequest(null)
        setSendError('')
        toast.success('The response was saved and restored from conversation history.')
      } else if (verified.length > 1) {
        setSendError('More than one saved conversation contains this message. Review history and open the correct conversation before continuing.')
      } else {
        setSendError('No saved response is visible yet. The request may still be completing; check history again before retrying.')
      }
    } catch (error) {
      setSendError(`Could not confirm the request outcome. ${requestMessage(error)}`)
    } finally {
      setCheckingOutcome(false)
    }
  }

  async function removeConversation(item) {
    if (!window.confirm('Delete this conversation? This cannot be undone.')) return
    setDeleting(item.conversation_id)
    try {
      await deleteChatbotConversation(item.conversation_id)
      setHistory((items) => items.filter((entry) => entry.conversation_id !== item.conversation_id))
      if (conversation?.conversation_id === item.conversation_id) setConversation(null)
      toast.success('Conversation deleted.')
    } catch (error) { toast.error(requestMessage(error)) }
    finally { setDeleting('') }
  }

  const messages = Array.isArray(conversation?.messages) ? conversation.messages : []
  return <div>
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Your career assistant</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">AI Chatbot</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Ask questions about interview preparation and career planning. Your conversations are saved to your account.</p></div><Button variant="outline" disabled={Boolean(uncertainRequest)} onClick={startNewConversation}><MessageSquarePlus size={16} />New conversation</Button></header>
    <div className="grid min-h-[34rem] gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <Card className="flex min-h-48 flex-col p-3 lg:max-h-[42rem]"><h2 className="px-2 py-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">Recent conversations</h2>
        {historyError ? <ErrorState title="History unavailable" message={historyError} onRetry={loadHistory} /> : loadingHistory ? <div className="grid gap-2 p-2">{[0, 1, 2].map((n) => <LoadingSkeleton key={n} className="h-12" />)}</div> : history.length ? <nav aria-label="Conversation history" className="grid gap-1 overflow-y-auto">{history.map((item) => <div key={item.conversation_id} className={`group flex items-start gap-1 rounded-control ${conversation?.conversation_id === item.conversation_id ? 'bg-brand-50 dark:bg-brand-950/50' : 'hover:bg-surface-muted'}`}><button type="button" onClick={() => openConversation(item)} className="min-w-0 flex-1 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><span className="block truncate text-sm font-medium text-ink">{item.title || 'Conversation'}</span><span className="mt-1 block text-xs text-ink-muted">{Array.isArray(item.messages) ? `${item.messages.length} recent messages` : 'Saved conversation'}</span></button><button type="button" aria-label={`Delete ${item.title || 'conversation'}`} disabled={Boolean(deleting)} onClick={() => removeConversation(item)} className="m-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-subtle opacity-100 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 disabled:opacity-50"><Trash2 size={14} /></button></div>)}</nav> : <p className="px-2 py-4 text-sm text-ink-muted">No saved conversations yet.</p>}
      </Card>
      <Card className="flex min-h-[34rem] flex-col p-0">
        <div className="flex items-center gap-3 border-b border-border-soft px-5 py-4"><span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-100 to-blue-100 text-brand-700 dark:from-brand-900/70 dark:to-blue-950/70 dark:text-brand-200"><Bot size={20} /></span><div><p className="font-semibold text-ink">PrepVela Assistant</p><p className="text-xs text-ink-muted">AI generated responses</p></div></div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" role="log" aria-label="Conversation messages" aria-live="polite">
          {loadingConversation ? <div className="grid gap-4"><LoadingSkeleton className="h-20 w-4/5" /><LoadingSkeleton className="ml-auto h-20 w-4/5" /></div> : messages.length === 0 ? <EmptyState icon={Bot} title="What would you like to work on?" description="Ask for interview practice tips, help structuring an answer, or career preparation guidance." /> : messages.map((item, index) => <div key={`${item.role}-${item.created_at || index}-${index}`} className={`flex items-start gap-2.5 ${item.role === 'user' ? 'justify-end' : ''}`}><span className={`mt-1 grid size-8 shrink-0 place-items-center rounded-full ${item.role === 'user' ? 'order-2 bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100' : 'bg-surface-muted text-ink-muted'}`}>{item.role === 'user' ? <UserRound size={15} /> : <Bot size={16} />}</span><div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[80%] ${item.role === 'user' ? 'order-1 rounded-tr-md bg-brand-600 text-white' : 'rounded-tl-md border border-border-soft bg-surface-muted/60 text-ink-secondary'}`}><p className="whitespace-pre-wrap break-words">{item.content}</p></div></div>)}
          {sending && <div className="flex items-center gap-3 text-sm text-ink-muted"><span className="grid size-8 place-items-center rounded-full bg-surface-muted"><Bot size={16} /></span><span className="animate-pulse motion-reduce:animate-none">Preparing a response…</span></div>}
          <div ref={endRef} />
        </div>
        <form onSubmit={handleSend} className="border-t border-border-soft p-4 sm:p-5"><Textarea ref={composerRef} label="Message" value={draft} onChange={(event) => { setDraft(event.target.value); if (sendError && !uncertainRequest) setSendError('') }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend(event) } }} placeholder="Ask a career or interview preparation question…" maxLength={10000} rows={3} error={sendError} hint={`${draft.length.toLocaleString()} / 10,000 · Enter to send, Shift+Enter for a new line`} className="min-h-24 resize-none" /><div className="mt-3 flex flex-wrap items-center justify-between gap-2">{uncertainRequest && <Button type="button" variant="outline" size="sm" onClick={checkUncertainOutcome} loading={checkingOutcome}>Check saved history</Button>}<Button type="submit" disabled={!draft.trim() || sending || Boolean(uncertainRequest)} loading={sending}><Send size={15} />Send message</Button></div></form>
      </Card>
    </div>
  </div>
}
