import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Textarea from '../../components/common/Textarea'

function lines(values) {
  return Array.isArray(values) ? values.join('\n') : ''
}

export default function JobFormDialog({ job, busy, error, onClose, onSave }) {
  const titleRef = useRef(null)
  const [form, setForm] = useState(() => ({
    title: job?.title || '',
    description: job?.description || '',
    category: job?.category || '',
    experience_level: job?.experience_level || '',
    difficulty: job?.difficulty || '',
    required_skills: lines(job?.required_skills),
    responsibilities: lines(job?.responsibilities),
  }))
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    titleRef.current?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onClose])

  function setField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.title.trim() || !form.description.trim() || !form.category.trim()) {
      setValidationError('Title, description, and category are required.')
      return
    }
    setValidationError('')
    await onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      experience_level: form.experience_level.trim(),
      difficulty: form.difficulty.trim(),
      required_skills: form.required_skills.split('\n').map((item) => item.trim()).filter(Boolean),
      responsibilities: form.responsibilities.split('\n').map((item) => item.trim()).filter(Boolean),
    })
  }

  return <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="job-form-title" className="my-4 w-full max-w-2xl rounded-panel border border-border-soft bg-surface shadow-float">
      <header className="flex items-start justify-between gap-3 border-b border-border-soft px-5 py-4 sm:px-6"><div><h2 id="job-form-title" className="text-lg font-semibold tracking-tight text-ink">{job ? 'Edit job role' : 'Create job role'}</h2><p className="mt-1 text-sm text-ink-muted">Enter the job fields supported by the jobs API.</p></div><button type="button" aria-label="Close job form" disabled={busy} onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60"><X size={18} /></button></header>
      <form onSubmit={submit} className="grid max-h-[78vh] gap-4 overflow-y-auto p-5 sm:p-6">
        <Input ref={titleRef} label="Job title" name="title" value={form.title} onChange={setField} required maxLength={160} autoComplete="off" />
        <Textarea label="Description" name="description" value={form.description} onChange={setField} required />
        <div className="grid gap-4 sm:grid-cols-3"><Input label="Category" name="category" value={form.category} onChange={setField} required /><Input label="Experience level" name="experience_level" value={form.experience_level} onChange={setField} /><Input label="Difficulty" name="difficulty" value={form.difficulty} onChange={setField} /></div>
        <Textarea label="Required skills" name="required_skills" value={form.required_skills} onChange={setField} hint="Enter one skill per line. Sent as a list." />
        <Textarea label="Responsibilities" name="responsibilities" value={form.responsibilities} onChange={setField} hint="Enter one responsibility per line. Sent as a list." />
        {(validationError || error) && <p role="alert" className="rounded-control border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{validationError || error}</p>}
        <div className="flex justify-end gap-2 border-t border-border-soft pt-4"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>{job ? 'Save changes' : 'Create job'}</Button></div>
      </form>
    </section>
  </div>
}
