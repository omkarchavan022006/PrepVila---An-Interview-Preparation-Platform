import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle, ArrowRight, Clock3, FileText, FileUp, LoaderCircle,
  Search, Sparkles, Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { analyzeResume, deleteResume, getResumes, uploadResume } from '../../api/resumeApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import Spinner from '../../components/common/Spinner'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx']
const statusTone = { completed: 'success', pending: 'warning', processing: 'info', failed: 'danger' }

function getErrorMessage(error) {
  return error.response?.data?.error || error.response?.data?.detail || 'The request could not be completed. Please try again.'
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function validateResumeFile(file) {
  if (!file) return 'Choose a resume file to upload.'
  if (!file.size) return 'This file is empty.'
  if (file.size > MAX_FILE_BYTES) return 'Resume file must be smaller than 5 MB.'
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  if (!ACCEPTED_EXTENSIONS.includes(extension)) return 'Only PDF and DOCX files are supported.'
  return ''
}

async function validateFileSignature(file) {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  const bytes = new Uint8Array(await file.slice(0, extension === '.pdf' ? 5 : 2).arrayBuffer())
  if (extension === '.pdf' && new TextDecoder().decode(bytes) !== '%PDF-') return 'Invalid PDF file. Choose a valid, text-based PDF.'
  if (extension === '.docx' && !(bytes[0] === 0x50 && bytes[1] === 0x4b)) return 'Invalid DOCX file. Choose a valid Word document.'
  return ''
}

function StatusBadge({ status }) {
  if (!status) return null
  const label = String(status).replaceAll('_', ' ')
  return <Badge tone={statusTone[status] || 'neutral'} className="capitalize">{label}</Badge>
}

function DeleteConfirmation({ filename, loading, onCancel, onConfirm }) {
  const cancelRef = useRef(null)
  useEffect(() => { cancelRef.current?.focus() }, [])
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [loading, onCancel])

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onCancel() }}>
    <motion.div role="alertdialog" aria-modal="true" aria-labelledby="delete-resume-title" aria-describedby="delete-resume-description" initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-md rounded-panel border border-border-soft bg-surface p-6 shadow-float">
      <span className="grid size-11 place-items-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"><Trash2 size={19} aria-hidden="true" /></span>
      <h2 id="delete-resume-title" className="mt-4 text-lg font-semibold tracking-tight text-ink">Delete this resume?</h2>
      <p id="delete-resume-description" className="mt-2 break-words text-sm leading-6 text-ink-muted"><span className="font-medium text-ink">{filename}</span> and its analysis will be permanently removed from your resume history.</p>
      <div className="mt-6 flex justify-end gap-2"><Button ref={cancelRef} variant="outline" disabled={loading} onClick={onCancel}>Cancel</Button><Button variant="danger" loading={loading} onClick={onConfirm}>Delete resume</Button></div>
    </motion.div>
  </div>
}

export default function ResumeAnalyzerPage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [resumes, setResumes] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [fileError, setFileError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [analyzingId, setAnalyzingId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const loadResumes = useCallback(async () => {
    try {
      const { data } = await getResumes()
      setListError('')
      setResumes(Array.isArray(data?.resumes) ? data.resumes : [])
      return true
    } catch (error) {
      setListError(getErrorMessage(error))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getResumes()
      .then(({ data }) => {
        if (!active) return
        setListError('')
        setResumes(Array.isArray(data?.resumes) ? data.resumes : [])
      })
      .catch((error) => { if (active) setListError(getErrorMessage(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function handleRetryList() {
    setLoading(true)
    setListError('')
    await loadResumes()
  }

  const handleFile = useCallback(async (file) => {
    setFileError('')
    const basicError = validateResumeFile(file)
    if (basicError) {
      setFileError(basicError)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    const signatureError = await validateFileSignature(file)
    if (signatureError) {
      setFileError(signatureError)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    setUploadProgress(0)
    try {
      const { data } = await uploadResume(file, (event) => {
        if (event.total) setUploadProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
      })
      if (data?.resume) setResumes((current) => [data.resume, ...current.filter((item) => item.id !== data.resume.id)])
      else await loadResumes()
      toast.success(data?.message || 'Resume uploaded successfully.')
      if (inputRef.current) inputRef.current.value = ''
    } catch (error) {
      const message = getErrorMessage(error)
      setFileError(message)
      toast.error(message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [loadResumes])

  async function handleAnalyze(resume) {
    setAnalyzingId(resume.id)
    try {
      const { data } = await analyzeResume(resume.id)
      toast.success(data?.message || 'Resume analysis completed.')
      await loadResumes()
      navigate(`/dashboard/resume-analyzer/${encodeURIComponent(resume.id)}`)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setAnalyzingId('')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { data } = await deleteResume(deleteTarget.id)
      setResumes((current) => current.filter((item) => item.id !== deleteTarget.id))
      toast.success(data?.message || 'Resume deleted.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setDeleting(false)
    }
  }

  function onDrop(event) {
    event.preventDefault()
    setDragOver(false)
    if (!uploading) handleFile(event.dataTransfer.files?.[0])
  }

  return <div>
    <header className="mb-7 sm:mb-9">
      <Badge tone="violet"><Sparkles size={12} className="mr-1" aria-hidden="true" />Resume tools</Badge>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">AI Resume Analyzer</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">Upload a resume to review its strengths, skills, and improvement opportunities.</p>
    </header>

    <section aria-labelledby="upload-resume-heading">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border-soft px-5 py-4 sm:px-6"><h2 id="upload-resume-heading" className="font-semibold tracking-tight text-ink">Upload a resume</h2><p className="mt-1 text-sm text-ink-muted">Files are checked for supported type, size, and basic file signature before upload.</p></div>
        <div className="p-4 sm:p-6">
          <div role="button" tabIndex={uploading ? -1 : 0} aria-label="Choose or drop a resume file" aria-describedby="resume-file-requirements" aria-disabled={uploading} onClick={() => !uploading && inputRef.current?.click()} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && !uploading) { event.preventDefault(); inputRef.current?.click() } }} onDragEnter={(event) => { event.preventDefault(); if (!uploading) setDragOver(true) }} onDragOver={(event) => { event.preventDefault(); if (!uploading) setDragOver(true) }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(false) }} onDrop={onDrop} className={`group flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-card border border-dashed px-5 py-8 text-center outline-none transition-all focus-visible:ring-4 focus-visible:ring-brand-200/60 ${dragOver ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/30' : 'border-border-strong bg-surface-muted/35 hover:border-brand-300 hover:bg-brand-50/40 dark:hover:bg-brand-950/20'} ${uploading ? 'cursor-wait opacity-80' : ''}`}>
            <input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Choose a PDF or DOCX resume" tabIndex={-1} className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} disabled={uploading} />
            <span className="grid size-14 place-items-center rounded-2xl border border-brand-100 bg-white text-brand-600 shadow-soft transition-transform group-hover:-translate-y-0.5 dark:border-brand-900 dark:bg-surface dark:text-brand-300">{uploading ? <Spinner label="Uploading resume" /> : <FileUp size={23} aria-hidden="true" />}</span>
            <p className="mt-4 text-sm font-semibold text-ink">{uploading ? 'Uploading your resume…' : 'Drop your resume here or browse files'}</p>
            <p id="resume-file-requirements" className="mt-1.5 text-xs text-ink-muted">PDF or DOCX · Maximum 5 MB · Text-readable files only</p>
            {uploading && <div className="mt-5 w-full max-w-sm" aria-live="polite"><div className="mb-2 flex justify-between text-xs text-ink-muted"><span>{uploadProgress ? 'Uploading' : 'Preparing upload'}</span><span>{uploadProgress ? `${uploadProgress}%` : <LoaderCircle size={14} className="animate-spin" aria-label="Preparing" />}</span></div><div role="progressbar" aria-label="Resume upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress} className="h-1.5 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-950"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-electric-500 transition-[width]" style={{ width: `${uploadProgress}%` }} /></div></div>}
            {!uploading && <span className="mt-4 inline-flex min-h-9 items-center rounded-control border border-border-soft bg-surface px-3 text-xs font-semibold text-ink-muted shadow-sm">Browse files</span>}
          </div>
          {fileError && <p role="alert" className="mt-3 flex items-start gap-2 rounded-control border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"><AlertCircle size={17} className="mt-0.5 shrink-0" />{fileError}</p>}
        </div>
      </Card>
    </section>

    <section aria-labelledby="resume-history-heading" className="mt-7 sm:mt-9">
      <div className="mb-4 flex items-end justify-between gap-3"><div><h2 id="resume-history-heading" className="text-lg font-semibold tracking-tight text-ink">Resume history</h2><p className="mt-1 text-sm text-ink-muted">Your uploaded files and their analysis status.</p></div><span className="hidden items-center gap-1.5 text-xs text-ink-subtle sm:flex"><Clock3 size={14} aria-hidden="true" />Newest first</span></div>
      {listError ? <Card><ErrorState title="Resume history unavailable" message={listError} onRetry={handleRetryList} /></Card> : loading ? <div className="grid gap-3">{[0, 1, 2].map((item) => <Card key={item} className="p-4 sm:p-5"><div className="flex items-center gap-4"><LoadingSkeleton className="size-11 shrink-0 rounded-xl" /><div className="min-w-0 flex-1"><LoadingSkeleton className="h-4 w-48" /><LoadingSkeleton className="mt-2 h-3 w-32" /></div><LoadingSkeleton className="h-9 w-28" /></div></Card>)}</div> : resumes.length === 0 ? <Card><EmptyState title="No resumes uploaded yet" description="Upload a PDF or DOCX resume above to start your analysis." icon={FileText} /></Card> : <div className="grid gap-3">{resumes.map((resume) => <Card as="article" key={resume.id} className="p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600 dark:border-brand-900 dark:bg-brand-950/60 dark:text-brand-300"><FileText size={19} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="max-w-full truncate text-sm font-semibold text-ink sm:max-w-md">{resume.filename || 'Resume file'}</h3>{resume.analysis_status && <StatusBadge status={resume.analysis_status} />}</div><p className="mt-1.5 text-xs text-ink-muted">Uploaded {formatDate(resume.created_at)}{resume.content_type ? ` · ${resume.content_type === 'application/pdf' ? 'PDF' : resume.content_type.includes('wordprocessingml') ? 'DOCX' : resume.content_type}` : ''}</p></div>
        {typeof resume.resume_score === 'number' && <div className="flex shrink-0 items-center gap-2 rounded-control border border-border-soft bg-surface-muted/60 px-3 py-2"><span className="text-xs text-ink-muted">Resume score</span><strong className="text-sm font-semibold text-ink">{resume.resume_score}<span className="text-xs font-medium text-ink-muted">/100</span></strong></div>}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/resume-analyzer/${encodeURIComponent(resume.id)}`)}>View details<ArrowRight size={14} /></Button>
          <Button size="sm" loading={analyzingId === resume.id} disabled={Boolean(analyzingId) || deleting} onClick={() => handleAnalyze(resume)}><Search size={14} />Analyze</Button>
          <Button variant="ghost" size="sm" aria-label={`Delete ${resume.filename || 'resume'}`} disabled={Boolean(analyzingId) || deleting} onClick={() => setDeleteTarget(resume)} className="text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40"><Trash2 size={16} /><span className="sm:hidden">Delete</span></Button>
        </div>
      </div></Card>)}</div>}
    </section>

    <AnimatePresence>{deleteTarget && <DeleteConfirmation filename={deleteTarget.filename || 'this resume'} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />}</AnimatePresence>
  </div>
}
