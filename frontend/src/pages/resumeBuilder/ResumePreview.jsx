import { Download, FileText } from 'lucide-react'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'

function DataSection({ title, children }) {
  if (!children) return null
  return <section className="mt-5 border-t border-slate-200 pt-4 first:mt-0 first:border-0 first:pt-0 dark:border-slate-700"><h3 className="text-xs font-bold uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300">{title}</h3><div className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{children}</div></section>
}

export default function ResumePreview({ data, pdfUrl, filename, onDownload, downloading = false }) {
  if (pdfUrl) return <Card className="overflow-hidden p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft px-4 py-3"><div className="flex min-w-0 items-center gap-2"><FileText size={17} className="shrink-0 text-brand-600 dark:text-brand-300" /><div className="min-w-0"><h2 className="text-sm font-semibold text-ink">Generated PDF preview</h2><p className="truncate text-xs text-ink-muted">{filename || 'Generated resume PDF'}</p></div></div>{onDownload && <Button variant="outline" size="sm" onClick={onDownload} loading={downloading}><Download size={14} />Download PDF</Button>}</div><iframe title={`Preview of ${filename || 'generated resume'}`} src={pdfUrl} className="h-[min(76vh,850px)] min-h-[34rem] w-full bg-slate-100 dark:bg-slate-900" /></Card>

  const value = data && typeof data === 'object' ? data : {}
  const skills = Array.isArray(value.skills) ? value.skills.filter((item) => typeof item === 'string' && item.trim()) : []
  const experience = Array.isArray(value.experience) ? value.experience.filter((item) => item && typeof item === 'object') : []
  const education = Array.isArray(value.education) ? value.education.filter((item) => item && typeof item === 'object') : []
  const projects = Array.isArray(value.projects) ? value.projects.filter((item) => item && typeof item === 'object') : []
  const certifications = Array.isArray(value.certifications) ? value.certifications.filter((item) => typeof item === 'string' && item.trim()) : []
  const achievements = Array.isArray(value.achievements) ? value.achievements.filter((item) => typeof item === 'string' && item.trim()) : []
  const hasContent = [value.full_name, value.professional_title, value.professional_summary, value.email, value.phone, value.location].some((item) => typeof item === 'string' && item.trim()) || skills.length || experience.length || education.length || projects.length || certifications.length || achievements.length

  return <Card className="overflow-hidden p-0"><div className="border-b border-border-soft px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-ink">Resume preview</h2><Badge>Input draft</Badge></div><p className="mt-1 text-xs leading-5 text-ink-muted">This preview reflects your form entries. The AI-polished content is available in the generated PDF.</p></div>{!hasContent ? <EmptyState title="Your draft will appear here" description="Add your details to preview the information you are submitting." icon={FileText} /> : <article className="mx-auto my-4 w-full max-w-2xl bg-white px-5 py-7 text-slate-900 shadow-card sm:my-6 sm:px-10 sm:py-10"><header className="border-b-2 border-violet-200 pb-4"><h2 className="break-words font-display text-2xl font-bold tracking-tight text-violet-950">{value.full_name}</h2>{value.professional_title && <p className="mt-1 text-sm font-semibold text-violet-700">{value.professional_title}</p>}<p className="mt-2 break-words text-xs text-slate-600">{[value.email, value.phone, value.location].filter((item) => typeof item === 'string' && item.trim()).join(' · ')}</p></header>
      {typeof value.professional_summary === 'string' && value.professional_summary.trim() && <DataSection title="Professional Summary"><p className="whitespace-pre-wrap">{value.professional_summary}</p></DataSection>}
      {skills.length > 0 && <DataSection title="Skills"><div className="flex flex-wrap gap-1.5">{skills.map((skill, index) => <span key={`${index}-${skill}`} className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs text-violet-900">{skill}</span>)}</div></DataSection>}
      {experience.length > 0 && <DataSection title="Experience"><div className="grid gap-4">{experience.map((item, index) => <div key={`experience-${index}`}><p className="font-semibold">{[item.job_title, item.company].filter((part) => typeof part === 'string' && part.trim()).join(' · ')}</p>{typeof item.duration === 'string' && <p className="text-xs text-slate-500">{item.duration}</p>}{Array.isArray(item.responsibilities) && item.responsibilities.length > 0 && <ul className="mt-1 list-disc pl-5">{item.responsibilities.filter((part) => typeof part === 'string' && part.trim()).map((part, partIndex) => <li key={`${partIndex}-${part}`}>{part}</li>)}</ul>}</div>)}</div></DataSection>}
      {education.length > 0 && <DataSection title="Education"><div className="grid gap-3">{education.map((item, index) => <div key={`education-${index}`}><p className="font-semibold">{typeof item.degree === 'string' ? item.degree : ''}</p><p>{[item.institution, item.year].filter((part) => typeof part === 'string' && part.trim()).join(' · ')}</p>{typeof item.details === 'string' && <p className="text-slate-600">{item.details}</p>}</div>)}</div></DataSection>}
      {projects.length > 0 && <DataSection title="Projects"><div className="grid gap-3">{projects.map((item, index) => <div key={`project-${index}`}><p className="font-semibold">{typeof item.name === 'string' ? item.name : ''}</p>{typeof item.description === 'string' && <p>{item.description}</p>}{Array.isArray(item.technologies) && item.technologies.length > 0 && <p className="text-xs text-slate-500">{item.technologies.filter((part) => typeof part === 'string').join(', ')}</p>}</div>)}</div></DataSection>}
      {certifications.length > 0 && <DataSection title="Certifications"><ul className="list-disc pl-5">{certifications.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></DataSection>}
      {achievements.length > 0 && <DataSection title="Achievements"><ul className="list-disc pl-5">{achievements.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></DataSection>}
    </article>}</Card>
}
