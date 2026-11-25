import { useState } from 'react'
import { Check, Copy, FileQuestion, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(successMessage)
    return true
  } catch {
    toast.error('Clipboard access is unavailable in this browser.')
    return false
  }
}

export default function QuestionSetView({ questions, className = '' }) {
  const [copiedIndex, setCopiedIndex] = useState(null)
  const items = Array.isArray(questions) ? questions.filter((item) => typeof item?.question === 'string' && item.question.trim()) : []

  if (items.length === 0) return <Card className={className}><EmptyState title="No questions were returned" description="This question set does not contain any questions." icon={FileQuestion} /></Card>

  function copyQuestion(question, index) {
    copyText(question.question, 'Question copied.').then((copied) => { if (copied) setCopiedIndex(index) })
  }

  function copyAll() {
    const text = items.map((item, index) => `${index + 1}. ${item.question}`).join('\n\n')
    copyText(text, 'All questions copied.')
  }

  return <section aria-label="Generated interview questions" className={className}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold tracking-tight text-ink">Questions</h2><p className="mt-1 text-sm text-ink-muted">{items.length} {items.length === 1 ? 'question' : 'questions'} in this set</p></div><Button variant="outline" size="sm" onClick={copyAll}><ListChecks size={15} />Copy all questions</Button></div>
      <div className="grid gap-3">{items.map((item, index) => <Card as="article" key={`${index}-${item.question}`} className="p-5 sm:p-6"><div className="flex items-start gap-3"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-sm font-bold text-brand-700 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-200">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{item.topic && <Badge tone="violet">{item.topic}</Badge>}{item.question_type && <Badge>{item.question_type}</Badge>}{item.difficulty && <Badge tone="info" className="capitalize">{item.difficulty}</Badge>}</div><p className="mt-3 whitespace-pre-line text-base font-medium leading-7 text-ink">{item.question}</p>
        {(item.answer || item.explanation) && <details className="mt-4 border-t border-border-soft pt-3"><summary className="cursor-pointer text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:text-brand-300">View returned answer and explanation</summary><div className="mt-3 grid gap-3">{item.answer && <div><h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Suggested answer</h3><p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink-secondary">{item.answer}</p></div>}{item.explanation && <div><h3 className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">What it evaluates</h3><p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-ink-secondary">{item.explanation}</p></div>}</div></details>}
        <div className="mt-3 flex justify-end"><Button variant="ghost" size="sm" aria-label={`Copy question ${index + 1}`} onClick={() => copyQuestion(item, index)}>{copiedIndex === index ? <Check size={15} /> : <Copy size={15} />}{copiedIndex === index ? 'Copied' : 'Copy question'}</Button></div>
      </div></div></Card>)}</div>
  </section>
}
