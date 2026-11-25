import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Download, Eye, FileText, History, Plus, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { deleteGeneratedResume, downloadGeneratedResume, getResumeBuilderHistory, saveResumeFile } from '../../api/resumeBuilderApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import ResumePreview from './ResumePreview'
import { createObjectUrl, formatResumeBuilderDate, getResumeBuilderError, revokeObjectUrl } from './resumeBuilderUtils'

function DeleteConfirmation({ resume, busy, onCancel, onConfirm }) {
  const cancelRef = useRef(null)
  useEffect(() => {
    cancelRef.current?.focus()
    function closeOnEscape(event) { if (event.key === 'Escape' && !busy) onCancel() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [busy, onCancel])
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}><section role="alertdialog" aria-modal="true" aria-labelledby="delete-resume-heading" aria-describedby="delete-resume-description" className="w-full max-w-md rounded-panel border border-border-soft bg-surface p-6 shadow-float"><span className="grid size-11 place-items-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"><Trash2 size={19} /></span><h2 id="delete-resume-heading" className="mt-4 text-lg font-semibold text-ink">Delete this generated resume?</h2><p id="delete-resume-description" className="mt-2 break-words text-sm leading-6 text-ink-muted">This permanently removes <strong className="font-semibold text-ink">{resume?.filename || 'this PDF'}</strong> and its saved record.</p><div className="mt-6 flex justify-end gap-2"><Button ref={cancelRef} variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button variant="danger" loading={busy} onClick={onConfirm}>Delete PDF</Button></div></section></div>
}

export default function ResumeBuilderHistoryPage() {
  const reduceMotion = useReducedMotion()
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [busyResumeId, setBusyResumeId] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [preview, setPreview] = useState(null)
  const previewCloseRef = useRef(null)

  useEffect(() => () => revokeObjectUrl(preview?.url), [preview?.url])
  useEffect(() => {
    if (!preview) return undefined
    const previousFocus = document.activeElement
    previewCloseRef.current?.focus()
    function handleEscape(event) { if (event.key === 'Escape') setPreview(null) }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      previousFocus?.focus?.()
    }
  }, [preview])

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await getResumeBuilderHistory()
      setResumes(Array.isArray(data?.resumes) ? data.resumes : [])
      setError('')
    } catch (requestError) {
      setError(getResumeBuilderError(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void loadHistory() }); return () => { active = false } }, [loadHistory])

  async function getPdf(resume, action) {
    if (busyResumeId) return
    setBusyResumeId(resume.id)
    setBusyAction(action)
    try {
      const file = await downloadGeneratedResume(resume.id, resume.filename)
      if (action === 'download') {
        saveResumeFile(file.blob, file.filename)
        toast.success('Resume PDF downloaded.')
      } else {
        const nextPreview = { ...file, url: createObjectUrl(file.blob), resumeId: resume.id }
        setPreview((current) => { revokeObjectUrl(current?.url); return nextPreview })
      }
    } catch (requestError) {
      toast.error(getResumeBuilderError(requestError))
    } finally {
      setBusyResumeId('')
      setBusyAction('')
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      const { data } = await deleteGeneratedResume(deleteTarget.id)
      setResumes((current) => current.filter((item) => item.id !== deleteTarget.id))
      if (preview?.resumeId === deleteTarget.id) setPreview(null)
      toast.success(data?.message || 'Generated resume deleted.')
      setDeleteTarget(null)
    } catch (requestError) {
      toast.error(getResumeBuilderError(requestError))
    } finally {
      setDeleting(false)
    }
  }

  return <div>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9"><div><Badge tone="violet"><History size={13} className="mr-1" />PDF library</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Generated resumes</h1><p className="mt-2 text-sm text-ink-muted">Your latest saved PDF files. The backend provides up to 50 records and does not paginate this list.</p></div><Button as={Link} to="/dashboard/resume-builder"><Plus size={16} />Build a resume</Button></header>
    {error ? <Card><ErrorState title="Resume history unavailable" message={error} onRetry={loadHistory} /></Card> : loading ? <div className="grid gap-3">{[0, 1, 2].map((item) => <Card key={item} className="p-5"><LoadingSkeleton className="h-5 w-56" /><LoadingSkeleton className="mt-4 h-4 w-40" /></Card>)}</div> : resumes.length === 0 ? <Card><EmptyState title="No generated resumes yet" description="Your saved PDFs will appear here after you generate a resume." icon={FileText} action={<Button as={Link} to="/dashboard/resume-builder">Create a resume</Button>} /></Card> : <div className="grid gap-3">{resumes.map((resume) => <Card as="article" key={resume.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><FileText size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="max-w-full truncate font-semibold text-ink">{resume.filename || 'Generated resume PDF'}</h2>{resume.content_type && <Badge>{resume.content_type}</Badge>}</div><p className="mt-1.5 text-xs text-ink-muted">Generated {formatResumeBuilderDate(resume.created_at)}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" loading={busyResumeId === resume.id && busyAction === 'preview'} disabled={Boolean(busyResumeId) || deleting} onClick={() => getPdf(resume, 'preview')}><Eye size={14} />Preview</Button><Button variant="outline" size="sm" loading={busyResumeId === resume.id && busyAction === 'download'} disabled={Boolean(busyResumeId) || deleting} onClick={() => getPdf(resume, 'download')}><Download size={14} />Download</Button><Button variant="ghost" size="sm" aria-label={`Delete ${resume.filename || 'generated resume'}`} className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40" disabled={Boolean(busyResumeId) || deleting} onClick={() => setDeleteTarget(resume)}><Trash2 size={15} /><span className="sm:hidden">Delete</span></Button></div></div></Card>)}</div>}

    <AnimatePresence>{preview && <div className="fixed inset-0 z-[70] grid place-items-center p-2 sm:p-5"><motion.button type="button" aria-label="Close PDF preview" className="absolute inset-0 h-full w-full bg-slate-950/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreview(null)} /><motion.section role="dialog" aria-modal="true" aria-label={`Resume PDF preview: ${preview.filename}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 10, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} className="relative z-10 max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-panel"><div className="absolute right-3 top-3 z-20 flex gap-2"><Button variant="outline" size="sm" onClick={() => { saveResumeFile(preview.blob, preview.filename); toast.success('Resume PDF downloaded.') }}><Download size={14} />Download</Button><Button ref={previewCloseRef} variant="secondary" size="sm" aria-label="Close preview" onClick={() => setPreview(null)}><X size={16} /></Button></div><ResumePreview pdfUrl={preview.url} filename={preview.filename} /></motion.section></div>}</AnimatePresence>
    <AnimatePresence>{deleteTarget && <DeleteConfirmation resume={deleteTarget} busy={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />}</AnimatePresence>
    <div className="mt-5"><Button as={Link} to="/dashboard/resume-builder" variant="ghost" size="sm"><ArrowLeft size={15} />Back to resume builder</Button></div>
  </div>
}
