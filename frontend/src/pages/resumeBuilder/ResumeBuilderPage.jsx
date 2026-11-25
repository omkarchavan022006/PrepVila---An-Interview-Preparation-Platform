import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, BriefcaseBusiness, Download, FileDown, FileText, GraduationCap, History, Plus, Sparkles, Trash2, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { generateResume, downloadGeneratedResume, saveResumeFile } from '../../api/resumeBuilderApi'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import Textarea from '../../components/common/Textarea'
import ResumePreview from './ResumePreview'
import { createObjectUrl, getResumeBuilderError, revokeObjectUrl } from './resumeBuilderUtils'

const emptyEducation = () => ({ degree: '', institution: '', year: '', details: '' })
const emptyExperience = () => ({ job_title: '', company: '', duration: '', responsibilities: '' })
const emptyProject = () => ({ name: '', description: '', technologies: '' })
const initialForm = () => ({ full_name: '', email: '', phone: '', location: '', professional_title: '', professional_summary: '', skills: '', education: [emptyEducation()], experience: [], projects: [], certifications: '', achievements: '' })

function splitLines(value) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean)
}

function SectionHeading({ icon: Icon, title, description }) {
  return <div className="mb-5 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200"><Icon size={18} /></span><div><h2 className="font-semibold text-ink">{title}</h2>{description && <p className="mt-1 text-sm leading-5 text-ink-muted">{description}</p>}</div></div>
}

function EntryHeader({ title, index, onRemove, canRemove }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-ink">{title} {index + 1}</h3>{canRemove && <Button type="button" variant="ghost" size="sm" aria-label={`Remove ${title.toLowerCase()} ${index + 1}`} className="text-rose-700 dark:text-rose-300" onClick={onRemove}><Trash2 size={15} /><span className="sr-only">Remove</span></Button>}</div>
}

export default function ResumeBuilderPage() {
  const reduceMotion = useReducedMotion()
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState('')
  const [validationErrors, setValidationErrors] = useState({})
  const [generating, setGenerating] = useState(false)
  const [generationUncertain, setGenerationUncertain] = useState(false)
  const [generatedResume, setGeneratedResume] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [pdfBusy, setPdfBusy] = useState('')
  const [pdfError, setPdfError] = useState('')

  useEffect(() => () => revokeObjectUrl(pdf?.url), [pdf?.url])

  const previewDraft = useMemo(() => ({
    ...form,
    skills: splitLines(form.skills),
    certifications: splitLines(form.certifications),
    achievements: splitLines(form.achievements),
    education: form.education,
    experience: form.experience.map((item) => ({ ...item, responsibilities: splitLines(item.responsibilities) })),
    projects: form.projects.map((item) => ({ ...item, technologies: splitLines(item.technologies) })),
  }), [form])

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setValidationErrors((current) => ({ ...current, [name]: '' }))
  }

  function updateRow(section, index, name, value) {
    setForm((current) => ({ ...current, [section]: current[section].map((item, row) => row === index ? { ...item, [name]: value } : item) }))
  }

  function validateAndBuildPayload() {
    const errors = {}
    const required = ['full_name', 'email', 'phone', 'location', 'professional_title', 'professional_summary']
    for (const field of required) if (!form[field].trim()) errors[field] = 'This field is required.'
    if (form.full_name.length > 150) errors.full_name = 'Use 150 characters or fewer.'
    if (form.phone.length > 30) errors.phone = 'Use 30 characters or fewer.'
    if (form.location.length > 150) errors.location = 'Use 150 characters or fewer.'
    if (form.professional_title.length > 150) errors.professional_title = 'Use 150 characters or fewer.'
    if (form.professional_summary.length > 2000) errors.professional_summary = 'Use 2,000 characters or fewer.'
    const skills = splitLines(form.skills)
    if (!skills.length || skills.length > 40) errors.skills = 'Enter between 1 and 40 skills, one per line.'
    else if (skills.some((item) => item.length > 100)) errors.skills = 'Each skill must be 100 characters or fewer.'
    if (!form.education.length || form.education.length > 10) errors.education = 'Add between 1 and 10 education entries.'
    const certifications = splitLines(form.certifications)
    const achievements = splitLines(form.achievements)
    if (certifications.length > 20) errors.certifications = 'Enter no more than 20 certifications.'
    else if (certifications.some((item) => item.length > 200)) errors.certifications = 'Each certification must be 200 characters or fewer.'
    if (achievements.length > 20) errors.achievements = 'Enter no more than 20 achievements.'
    else if (achievements.some((item) => item.length > 300)) errors.achievements = 'Each achievement must be 300 characters or fewer.'
    if (form.experience.length > 15) errors.experience = 'Enter no more than 15 experience entries.'
    if (form.projects.length > 15) errors.projects = 'Enter no more than 15 project entries.'
    if (Object.keys(errors).length) {
      setValidationErrors(errors)
      setFormError('Review the highlighted fields and try again.')
      return null
    }

    return {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      professional_title: form.professional_title.trim(),
      professional_summary: form.professional_summary.trim(),
      skills,
      education: form.education.map((item) => ({ degree: item.degree.trim(), institution: item.institution.trim(), year: item.year.trim(), details: item.details.trim() })),
      experience: form.experience.map((item) => ({ job_title: item.job_title.trim(), company: item.company.trim(), duration: item.duration.trim(), responsibilities: splitLines(item.responsibilities) })),
      projects: form.projects.map((item) => ({ name: item.name.trim(), description: item.description.trim(), technologies: splitLines(item.technologies) })),
      certifications,
      achievements,
    }
  }

  async function retrievePdf(resume, action = 'preview') {
    if (!resume?.id) return
    setPdfBusy(action)
    setPdfError('')
    try {
      const file = await downloadGeneratedResume(resume.id, resume.filename)
      if (action === 'download') {
        saveResumeFile(file.blob, file.filename)
        toast.success('Resume PDF downloaded.')
      }
      const nextPdf = { ...file, url: createObjectUrl(file.blob), resumeId: resume.id }
      setPdf((current) => { revokeObjectUrl(current?.url); return nextPdf })
    } catch (error) {
      const message = getResumeBuilderError(error)
      setPdfError(message)
      if (action === 'download') toast.error(message)
    } finally {
      setPdfBusy('')
    }
  }

  async function handleGenerate(event) {
    event.preventDefault()
    if (generating) return
    setFormError('')
    setValidationErrors({})
    const payload = validateAndBuildPayload()
    if (!payload) return
    setGenerating(true)
    let response
    try {
      response = await generateResume(payload)
    } catch (error) {
      const message = getResumeBuilderError(error)
      setFormError(message)
      if (!error.response && ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code)) {
        setGenerationUncertain(true)
        setFormError('The request timed out, so generation may have completed. Check generated resumes before trying again.')
      } else if (!error.response) {
        setGenerationUncertain(true)
        setFormError('The connection was lost, so generation may have completed. Check generated resumes before trying again.')
      }
      toast.error(message)
      setGenerating(false)
      return
    }
    const resume = response.data?.resume
    if (!resume?.id) {
      setFormError('The server did not return a generated resume record. Check generated resumes before submitting again.')
      setGenerationUncertain(true)
      setGenerating(false)
      return
    }
    setGenerationUncertain(false)
    setGeneratedResume(resume)
    setPdf(null)
    toast.success(response.data?.message || 'Your resume PDF is ready.')
    await retrievePdf(resume, 'preview')
    setGenerating(false)
  }

  return <div>
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9"><div><Badge tone="violet"><Sparkles size={13} className="mr-1" />AI resume builder</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Build your resume</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted sm:text-base">Add your professional details and let the resume service polish them into a downloadable PDF.</p></div><Button as={Link} to="/dashboard/resume-builder/history" variant="outline"><History size={16} />Generated resumes</Button></header>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
      <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.22 }}>
        <form onSubmit={handleGenerate} className="grid gap-5">
          <Card className="p-5 sm:p-6"><SectionHeading icon={UserRound} title="Contact and professional details" description="These required fields identify you and guide the resume rewrite." /><div className="grid gap-4 sm:grid-cols-2"><Input label="Full name" value={form.full_name} maxLength={150} onChange={(event) => updateField('full_name', event.target.value)} error={validationErrors.full_name} autoComplete="name" /><Input label="Email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} error={validationErrors.email} autoComplete="email" /><Input label="Phone" value={form.phone} maxLength={30} onChange={(event) => updateField('phone', event.target.value)} error={validationErrors.phone} autoComplete="tel" /><Input label="Location" value={form.location} maxLength={150} onChange={(event) => updateField('location', event.target.value)} error={validationErrors.location} autoComplete="address-level2" /><div className="sm:col-span-2"><Input label="Professional title" value={form.professional_title} maxLength={150} onChange={(event) => updateField('professional_title', event.target.value)} error={validationErrors.professional_title} placeholder="Your current or target professional title" /></div><div className="sm:col-span-2"><Textarea label="Professional summary" value={form.professional_summary} maxLength={2000} onChange={(event) => updateField('professional_summary', event.target.value)} error={validationErrors.professional_summary} hint={`${form.professional_summary.length}/2,000 characters`} rows={5} /></div></div></Card>

          <Card className="p-5 sm:p-6"><SectionHeading icon={Sparkles} title="Skills" description="Add 1–40 skills, one per line. Each can be up to 100 characters." /><Textarea label="Skills" value={form.skills} onChange={(event) => updateField('skills', event.target.value)} error={validationErrors.skills} placeholder={'JavaScript\nReact\nDjango'} rows={5} /></Card>

          <Card className="p-5 sm:p-6"><SectionHeading icon={GraduationCap} title="Education" description="At least one education entry is required. You can add up to 10." />{validationErrors.education && <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-300">{validationErrors.education}</p>}<div className="grid gap-4">{form.education.map((item, index) => <div key={`education-${index}`} className="rounded-card border border-border-soft bg-surface-muted/30 p-4"><EntryHeader title="Education" index={index} canRemove={form.education.length > 1} onRemove={() => setForm((current) => ({ ...current, education: current.education.filter((_, row) => row !== index) }))} /><div className="grid gap-3 sm:grid-cols-2"><Input label="Degree" value={item.degree} onChange={(event) => updateRow('education', index, 'degree', event.target.value)} /><Input label="Institution" value={item.institution} onChange={(event) => updateRow('education', index, 'institution', event.target.value)} /><Input label="Year" value={item.year} onChange={(event) => updateRow('education', index, 'year', event.target.value)} /><Input label="Details" value={item.details} onChange={(event) => updateRow('education', index, 'details', event.target.value)} /></div></div>)}</div>{form.education.length < 10 && <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setForm((current) => ({ ...current, education: [...current.education, emptyEducation()] }))}><Plus size={15} />Add education</Button>}</Card>

          <Card className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><SectionHeading icon={BriefcaseBusiness} title="Work experience" description="Optional, up to 15 entries. Responsibilities are entered one per line." />{form.experience.length < 15 && <Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, experience: [...current.experience, emptyExperience()] }))}><Plus size={15} />Add experience</Button>}</div>{validationErrors.experience && <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-300">{validationErrors.experience}</p>}<div className="grid gap-4">{form.experience.map((item, index) => <div key={`experience-${index}`} className="rounded-card border border-border-soft bg-surface-muted/30 p-4"><EntryHeader title="Experience" index={index} canRemove onRemove={() => setForm((current) => ({ ...current, experience: current.experience.filter((_, row) => row !== index) }))} /><div className="grid gap-3 sm:grid-cols-2"><Input label="Job title" value={item.job_title} onChange={(event) => updateRow('experience', index, 'job_title', event.target.value)} /><Input label="Company" value={item.company} onChange={(event) => updateRow('experience', index, 'company', event.target.value)} /><div className="sm:col-span-2"><Input label="Duration" value={item.duration} onChange={(event) => updateRow('experience', index, 'duration', event.target.value)} placeholder="Dates or duration" /></div><div className="sm:col-span-2"><Textarea label="Responsibilities" value={item.responsibilities} onChange={(event) => updateRow('experience', index, 'responsibilities', event.target.value)} hint="One responsibility per line." rows={4} /></div></div></div>)}</div>{form.experience.length === 0 && <p className="text-sm text-ink-muted">No work experience added.</p>}</Card>

          <Card className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><SectionHeading icon={FileText} title="Projects" description="Optional, up to 15 entries." />{form.projects.length < 15 && <Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, projects: [...current.projects, emptyProject()] }))}><Plus size={15} />Add project</Button>}</div>{validationErrors.projects && <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-300">{validationErrors.projects}</p>}<div className="grid gap-4">{form.projects.map((item, index) => <div key={`project-${index}`} className="rounded-card border border-border-soft bg-surface-muted/30 p-4"><EntryHeader title="Project" index={index} canRemove onRemove={() => setForm((current) => ({ ...current, projects: current.projects.filter((_, row) => row !== index) }))} /><div className="grid gap-3"><Input label="Project name" value={item.name} onChange={(event) => updateRow('projects', index, 'name', event.target.value)} /><Textarea label="Description" value={item.description} onChange={(event) => updateRow('projects', index, 'description', event.target.value)} rows={3} /><Textarea label="Technologies" value={item.technologies} onChange={(event) => updateRow('projects', index, 'technologies', event.target.value)} hint="One technology per line." rows={2} /></div></div>)}</div>{form.projects.length === 0 && <p className="text-sm text-ink-muted">No projects added.</p>}</Card>

          <Card className="p-5 sm:p-6"><SectionHeading icon={FileText} title="Certifications and achievements" description="Both sections are optional. Enter one item per line." /><div className="grid gap-4 sm:grid-cols-2"><Textarea label="Certifications" value={form.certifications} onChange={(event) => updateField('certifications', event.target.value)} error={validationErrors.certifications} hint="Up to 20 items; 200 characters each." rows={5} /><Textarea label="Achievements" value={form.achievements} onChange={(event) => updateField('achievements', event.target.value)} error={validationErrors.achievements} hint="Up to 20 items; 300 characters each." rows={5} /></div></Card>

          {formError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"><span>{formError}</span>{generationUncertain && <div className="flex flex-wrap gap-2"><Button as={Link} to="/dashboard/resume-builder/history" variant="outline" size="sm">Check history</Button><Button type="button" variant="ghost" size="sm" onClick={() => { setGenerationUncertain(false); setFormError('') }}>I checked; allow retry</Button></div>}</div>}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-900/60 dark:bg-brand-950/30"><p className="max-w-lg text-xs leading-5 text-ink-muted">Your information is sent to the existing resume generation service. It returns a generated PDF and metadata.</p><Button type="submit" loading={generating} disabled={generationUncertain}><Sparkles size={16} />Generate resume<ArrowRight size={15} /></Button></div>
        </form>
      </motion.div>

      <div className="grid gap-4 xl:sticky xl:top-24">{generatedResume && <Card className="p-5"><Badge tone="success">Resume generated</Badge><h2 className="mt-3 font-semibold text-ink">{generatedResume.filename || 'Your generated PDF is ready'}</h2><p className="mt-1 text-xs text-ink-muted">Generated {generatedResume.created_at ? new Date(generatedResume.created_at).toLocaleString() : 'just now'}</p>{pdfError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{pdfError}</p>}<div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" loading={pdfBusy === 'preview'} onClick={() => retrievePdf(generatedResume, 'preview')}><FileText size={14} />Preview PDF</Button><Button type="button" size="sm" loading={pdfBusy === 'download'} onClick={() => retrievePdf(generatedResume, 'download')}><Download size={14} />Download PDF</Button></div><p className="mt-3 text-xs leading-5 text-ink-muted">The generate endpoint returns file metadata rather than polished text. Preview and download both load the actual saved PDF.</p></Card>}
        <AnimatePresence mode="wait"><motion.div key={pdf?.resumeId || 'draft'} initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}><ResumePreview data={previewDraft} pdfUrl={pdf?.url} filename={pdf?.filename} onDownload={pdf ? () => { saveResumeFile(pdf.blob, pdf.filename); toast.success('Resume PDF downloaded.') } : undefined} /></motion.div></AnimatePresence>
        <Card className="p-4"><p className="flex items-start gap-2 text-xs leading-5 text-ink-muted"><FileDown size={15} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />Generated PDFs are stored by the backend and can be reopened from <Link to="/dashboard/resume-builder/history" className="font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300">resume history</Link>.</p></Card>
      </div>
    </div>
  </div>
}
