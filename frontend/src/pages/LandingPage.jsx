import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowDown,
  ArrowRight,
  AudioLines,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Bug,
  Check,
  ChevronDown,
  ClipboardCheck,
  Code2,
  FileSearch,
  FileText,
  MessageCircle,
  MessageSquareText,
  Mic,
  Sparkles,
  Target,
  WandSparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const features = [
  { icon: FileSearch, title: 'AI Resume Analyzer', description: 'Understand how your resume communicates experience, skills, and impact.' },
  { icon: Mic, title: 'AI Mock Interviews', description: 'Practice answering role-focused questions in a guided interview flow.' },
  { icon: Target, title: 'Skill Gap Analysis', description: 'Compare your strengths with a target role and see where to focus next.' },
  { icon: MessageSquareText, title: 'AI Interview Questions', description: 'Generate relevant questions around roles, skills, and interview topics.' },
  { icon: ClipboardCheck, title: 'Interview Feedback', description: 'Review structured feedback and practical suggestions after practice.' },
  { icon: WandSparkles, title: 'AI Resume Builder', description: 'Shape clearer resume content with guided, AI-assisted editing.' },
  { icon: Code2, title: 'AI Coding Interview', description: 'Work through coding prompts and review an AI-assisted evaluation.' },
  { icon: Bug, title: 'AI Code Debugger', description: 'Explore possible causes and fixes with a guided code analysis.' },
  { icon: Bot, title: 'AI Career Chatbot', description: 'Ask career and preparation questions in a focused conversation.' },
]

const faqs = [
  { question: 'What can I do with the platform?', answer: 'The platform brings together resume analysis, interview practice, skill gap insights, question generation, coding practice, and career guidance tools.' },
  { question: 'Do I need a resume to get started?', answer: 'You can create an account to explore the preparation workspace. Resume analysis and resume-based guidance require a resume upload.' },
  { question: 'Are the dashboard metrics on this page real?', answer: 'No. The product preview uses illustrative sample content to show the interface. It is not connected to a real user account or live results.' },
  { question: 'Are paid plans available?', answer: 'The plan outline on this page is illustrative. Subscription and payment features are not available yet.' },
  { question: 'Can I use the platform on mobile?', answer: 'The website is designed to adapt to mobile, tablet, and desktop screens. Some workspace experiences may be more comfortable on a larger display.' },
]
const copyrightYear = new Date().getFullYear()

function Reveal({ children, className = '', delay = 0, ...props }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

function SectionHeading({ eyebrow, title, description, align = 'center' }) {
  return (
    <div className={`mx-auto max-w-3xl ${align === 'left' ? '' : 'text-center'}`}>
      {eyebrow && <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/75 px-3 py-1.5 text-xs font-semibold tracking-wide text-brand-700 shadow-soft dark:border-brand-800/80 dark:bg-brand-950/50 dark:text-brand-200"><Sparkles size={13} aria-hidden="true" />{eyebrow}</p>}
      <h2 className="font-display text-3xl font-semibold tracking-[-0.045em] text-ink sm:text-4xl lg:text-[3.25rem] lg:leading-[1.08]">{title}</h2>
      {description && <p className={`mt-5 max-w-2xl text-base leading-7 text-ink-muted sm:text-lg sm:leading-8 ${align === 'left' ? '' : 'mx-auto'}`}>{description}</p>}
    </div>
  )
}

function PrimaryLink({ to = '/register', children, className = '', variant = 'primary' }) {
  const variantClasses = variant === 'light'
    ? 'border-white/20 bg-gradient-to-b from-white to-white text-brand-900 shadow-none hover:from-brand-50 hover:to-brand-50'
    : 'border-brand-600 bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_12px_30px_-14px_rgb(91_50_184_/_0.95)] hover:from-brand-500 hover:to-brand-700'
  return <Link to={to} className={`group inline-flex min-h-12 items-center justify-center gap-2 rounded-control border px-5 font-semibold transition duration-standard hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-300/50 ${variantClasses} ${className}`}>{children}<ArrowRight size={17} aria-hidden="true" className="transition-transform duration-quick group-hover:translate-x-0.5" /></Link>
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div aria-hidden="true" className="absolute -inset-x-10 -inset-y-10 -z-10 rounded-[3rem] bg-gradient-to-br from-brand-300/25 via-electric-300/15 to-violet-300/25 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 28, rotateX: 4 }}
        whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
        className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/90 text-slate-900 shadow-[0_40px_120px_-44px_rgba(63,42,115,0.55)] ring-1 ring-brand-200/50 dark:border-white/10 dark:bg-[#111626] dark:text-slate-100 dark:ring-white/10 sm:rounded-[2rem]"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-white/10 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5"><span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-electric-600 text-white"><Sparkles size={15} aria-hidden="true" /></span><span className="text-sm font-semibold tracking-tight">PrepVela</span><span className="hidden rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400 sm:inline-flex">Workspace preview</span></div>
          <div className="flex items-center gap-2"><span className="hidden text-xs text-slate-400 sm:inline">Illustrative preview</span><span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" /><span className="size-7 rounded-full bg-gradient-to-br from-brand-200 to-electric-200 dark:from-brand-800 dark:to-blue-900" aria-hidden="true" /></div>
        </div>
        <div className="grid min-h-[24rem] md:grid-cols-[13rem_1fr]">
          <aside className="hidden border-r border-slate-200/80 p-5 dark:border-white/10 md:block">
            <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Preparation</p>
            <div className="space-y-1 text-xs font-medium">
              <div className="flex items-center gap-2.5 rounded-xl bg-brand-50 px-3 py-2.5 text-brand-700 dark:bg-brand-950/70 dark:text-brand-200"><BriefcaseBusiness size={15} />Overview</div>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-500 dark:text-slate-400"><FileText size={15} />Resume analysis</div>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-500 dark:text-slate-400"><AudioLines size={15} />Mock interviews</div>
              <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-slate-500 dark:text-slate-400"><BrainCircuit size={15} />Skill insights</div>
            </div>
            <div className="mt-10 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-blue-50 p-3 dark:border-white/10 dark:from-brand-950/60 dark:to-blue-950/50"><Sparkles size={15} className="text-brand-600 dark:text-brand-300" /><p className="mt-2 text-xs font-semibold">Your next step</p><p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">Practice one answer and review the feedback.</p></div>
          </aside>
          <div className="min-w-0 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-xs font-medium text-slate-400">YOUR PREPARATION SPACE</p><h3 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">A little progress, every day.</h3></div>
              <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">SAMPLE CONTENT</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[['Resume review', 'Ready to explore', 'from-brand-500 to-violet-400'], ['Interview practice', 'Build your rhythm', 'from-electric-500 to-cyan-400'], ['Skill focus', 'Choose a target role', 'from-fuchsia-500 to-brand-400']].map(([title, text, gradient]) => <div key={title} className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"><div className={`mb-4 h-1.5 w-10 rounded-full bg-gradient-to-r ${gradient}`} /><p className="text-xs font-semibold">{title}</p><p className="mt-1 text-[11px] text-slate-400">{text}</p></div>)}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
                <div className="flex items-center justify-between"><div><p className="text-xs font-semibold">Practice snapshot</p><p className="mt-1 text-[11px] text-slate-400">Illustrative session activity</p></div><span className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"><ChartBars /></span></div>
                <div className="mt-5 flex h-24 items-end gap-2 sm:h-28">{[35, 50, 42, 68, 57, 82, 70, 92, 64, 76, 55, 88].map((height, i) => <motion.span key={i} initial={{ height: 0 }} whileInView={{ height: `${height}%` }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.035 }} className={`flex-1 rounded-t-md ${i === 7 ? 'bg-gradient-to-t from-brand-600 to-electric-400' : 'bg-brand-100 dark:bg-brand-900/70'}`} />)}</div>
                <div className="mt-3 flex justify-between text-[10px] text-slate-400"><span>Practice activity</span><span>Sample visualization</span></div>
              </div>
              <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-blue-50/80 p-4 dark:border-white/10 dark:from-brand-950/40 dark:to-blue-950/30 sm:p-5">
                <div className="flex items-center gap-2 text-brand-700 dark:text-brand-200"><Sparkles size={15} /><p className="text-xs font-semibold">Feedback preview</p></div>
                <p className="mt-4 text-sm font-semibold leading-6">Make your impact more specific.</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">A sample coaching note could help you connect your actions to a clear outcome.</p>
                <div className="mt-4 flex items-center gap-2 border-t border-brand-100 pt-3 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:text-slate-400"><Check size={13} className="text-emerald-500" />Example feedback, not a live result</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div aria-hidden="true" animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="absolute -left-4 top-16 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-card backdrop-blur dark:border-white/10 dark:bg-[#171d30]/90 dark:text-slate-200 lg:flex"><span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"><Check size={15} /></span>Practice at your pace</motion.div>
      <motion.div aria-hidden="true" animate={{ y: [0, 7, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="absolute -right-4 bottom-16 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-card backdrop-blur dark:border-white/10 dark:bg-[#171d30]/90 dark:text-slate-200 lg:flex"><span className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300"><Sparkles size={15} /></span>Turn insight into action</motion.div>
    </div>
  )
}

function ChartBars() {
  return <span aria-hidden="true" className="flex h-4 items-end gap-0.5"><i className="h-2 w-1 rounded-sm bg-current opacity-60" /><i className="h-3 w-1 rounded-sm bg-current opacity-80" /><i className="h-4 w-1 rounded-sm bg-current" /></span>
}

function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <div className="mx-auto mt-12 max-w-3xl divide-y divide-border-soft border-y border-border-soft">
      {faqs.map((faq, index) => {
        const expanded = open === index
        const panelId = `faq-panel-${index}`
        return <div key={faq.question}>
          <h3><button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(expanded ? -1 : index)} className="flex w-full items-center justify-between gap-5 py-5 text-left text-sm font-semibold text-ink transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:hover:text-brand-300 sm:text-base">{faq.question}<ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-ink-muted transition-transform duration-standard ${expanded ? 'rotate-180' : ''}`} /></button></h3>
          <AnimatePresence initial={false}>
            {expanded && <motion.div id={panelId} role="region" aria-label={faq.question} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden"><p className="max-w-2xl pb-5 pr-8 text-sm leading-7 text-ink-muted">{faq.answer}</p></motion.div>}
          </AnimatePresence>
        </div>
      })}
    </div>
  )
}

export default function LandingPage() {
  const reduceMotion = useReducedMotion()
  return (
    <div className="overflow-hidden">
      <section className="relative px-page pb-16 pt-14 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[34rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(135,94,240,0.15),rgba(96,165,250,0.08)_42%,transparent_70%)] dark:bg-[radial-gradient(ellipse,rgba(109,75,198,0.21),rgba(49,101,185,0.1)_42%,transparent_70%)]" />
        <div className="mx-auto max-w-7xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-white/75 px-3.5 py-2 text-xs font-semibold text-brand-700 shadow-soft backdrop-blur dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-200"><Sparkles size={14} aria-hidden="true" />A clearer path to your next opportunity</span>
            <h1 className="mx-auto mt-6 max-w-5xl font-display text-[clamp(2.7rem,7vw,5.4rem)] font-semibold leading-[1.02] tracking-[-0.065em] text-ink">Your Next Career Move<br className="hidden sm:block" /> Starts <span className="bg-gradient-to-r from-brand-600 via-violet-500 to-electric-500 bg-clip-text text-transparent dark:from-brand-300 dark:via-violet-300 dark:to-electric-400">With AI.</span></h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">Build confidence for the conversations ahead. Practice interviews, sharpen your story, and turn useful feedback into your next step.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><PrimaryLink>Get started</PrimaryLink><a href="#features" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-border-strong/80 bg-surface/70 px-5 font-semibold text-ink-secondary shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/70">Explore features <ArrowDown size={16} aria-hidden="true" /></a></div>
            <p className="mt-4 text-xs text-ink-subtle">A focused practice space, built around your career goals.</p>
          </Reveal>
        </div>
        <div className="mx-auto mt-14 max-w-7xl sm:mt-20 lg:mt-24"><ProductPreview /></div>
        <a href="#value" className="mx-auto mt-10 flex w-fit flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-subtle transition hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">Scroll to explore <span className="animate-bounce motion-reduce:animate-none"><ArrowDown size={14} /></span></a>
      </section>

      <section id="value" className="scroll-mt-24 border-y border-border-soft/80 bg-white/45 px-page py-14 dark:bg-white/[0.015] sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <Reveal><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">Preparation that connects the dots</p><h2 className="mt-4 max-w-lg text-2xl font-semibold leading-tight tracking-[-0.04em] text-ink sm:text-3xl">One place to practice, reflect, and move forward.</h2></Reveal>
          <Reveal delay={0.1}><div className="grid gap-3 sm:grid-cols-3">{[['Tell your story', 'Use resume insights to bring your experience into focus.'], ['Practice out loud', 'Get a repeatable space to work through interview questions.'], ['Choose what is next', 'Use feedback and skill insights to guide your preparation.']].map(([title, body], i) => <div key={title} className="border-l-2 border-brand-300 py-1 pl-4 dark:border-brand-700"><span className="text-[10px] font-bold tracking-widest text-brand-600 dark:text-brand-300">0{i + 1}</span><h3 className="mt-2 text-sm font-semibold text-ink">{title}</h3><p className="mt-1.5 text-xs leading-5 text-ink-muted">{body}</p></div>)}</div></Reveal>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 px-page py-section">
        <div className="mx-auto max-w-7xl"><Reveal><SectionHeading eyebrow="Your preparation toolkit" title="Everything you need to feel ready." description="A connected set of AI-assisted tools for your resume, interviews, skills, and career questions." /></Reveal>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.08 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.055 } } }} className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, index) => <motion.article key={title} variants={{ hidden: reduceMotion ? {} : { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }} transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }} whileHover={reduceMotion ? undefined : { y: -4 }} className={`group relative overflow-hidden rounded-card border border-border-soft bg-surface p-5 shadow-soft transition-colors duration-standard hover:border-brand-200 hover:shadow-card dark:hover:border-brand-800 sm:p-6 ${index === 0 || index === 4 || index === 8 ? 'lg:bg-gradient-to-br lg:from-white lg:to-brand-50/50 lg:dark:from-surface lg:dark:to-brand-950/20' : ''}`}>
              <span className="absolute -right-8 -top-8 size-24 rounded-full bg-brand-100/60 blur-2xl transition duration-500 group-hover:bg-electric-200/60 dark:bg-brand-900/30 dark:group-hover:bg-electric-900/20" aria-hidden="true" /><div className="relative"><span className="grid size-11 place-items-center rounded-control border border-brand-100 bg-gradient-to-br from-brand-50 to-blue-50 text-brand-700 dark:border-brand-900 dark:from-brand-950/70 dark:to-blue-950/50 dark:text-brand-200"><Icon size={19} aria-hidden="true" /></span><h3 className="mt-5 text-base font-semibold tracking-tight text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p></div>
            </motion.article>)}
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-y border-border-soft/80 bg-white/45 px-page py-section dark:bg-white/[0.015]">
        <div className="mx-auto max-w-7xl"><Reveal><SectionHeading eyebrow="A simple rhythm" title="Prepare with a little more intention." description="Move from what you have today to the next skill or answer you want to strengthen." /></Reveal>
          <div className="relative mt-14 grid gap-5 md:grid-cols-3">{!reduceMotion && <div aria-hidden="true" className="absolute left-[16%] right-[16%] top-9 hidden border-t border-dashed border-brand-300 dark:border-brand-800 md:block" />}{[['01', 'Upload your resume', 'Start with your experience. Get a clearer view of your strengths and areas to sharpen.', FileText], ['02', 'Practice with AI', 'Work through interview questions and coding prompts in a guided practice flow.', MessageCircle], ['03', 'Review and improve', 'Use structured feedback and skill insights to decide what to practice next.', ChartBars]].map(([number, title, text, Icon], i) => <Reveal key={number} delay={i * 0.1} className="relative rounded-card border border-border-soft bg-surface p-6 shadow-soft sm:p-7"><span className="relative z-10 grid size-[4.5rem] place-items-center rounded-2xl border border-brand-100 bg-gradient-to-br from-white to-brand-50 text-brand-700 shadow-soft dark:border-brand-900 dark:from-surface dark:to-brand-950/70 dark:text-brand-200"><Icon size={22} aria-hidden="true" /></span><p className="mt-6 text-[10px] font-bold tracking-[0.18em] text-brand-600 dark:text-brand-300">STEP {number}</p><h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p></Reveal>)}</div>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 px-page py-section">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal><SectionHeading align="left" eyebrow="Why PrepVela" title="Less guesswork. More meaningful practice." description="Interview preparation can feel scattered. Bring the important pieces together so your effort has direction." /><div className="mt-7"><PrimaryLink>Start preparing</PrimaryLink></div></Reveal>
          <div className="grid gap-3 sm:grid-cols-2">{[[Sparkles, 'Built around your goals', 'Focus practice on the roles and skills that matter to you.'], [ClipboardCheck, 'Feedback you can act on', 'Turn broad impressions into clear areas to work on.'], [BrainCircuit, 'Tools that work together', 'Connect resume insights, practice, and skill development.'], [Clock3Icon, 'Progress at your pace', 'Return to your preparation when it fits your schedule.']].map(([Icon, title, text], i) => <Reveal key={title} delay={i * 0.06}><div className={`h-full rounded-card border border-border-soft bg-surface p-5 shadow-soft ${i % 2 ? 'sm:translate-y-6' : ''}`}><Icon size={18} className="text-brand-600 dark:text-brand-300" aria-hidden="true" /><h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3><p className="mt-2 text-xs leading-5 text-ink-muted">{text}</p></div></Reveal>)}</div>
        </div>
      </section>

      <section className="px-page pb-section">
        <div className="mx-auto max-w-7xl"><Reveal><SectionHeading eyebrow="A closer look" title="A workspace designed for your next step." description="Explore an illustrative preview of how practice, resume insights, and coaching notes can come together." /></Reveal><div className="mt-12"><ProductPreview /></div></div>
      </section>

      <section id="pricing" className="scroll-mt-24 border-y border-border-soft/80 bg-white/45 px-page py-section dark:bg-white/[0.015]">
        <div className="mx-auto max-w-5xl"><Reveal><SectionHeading eyebrow="Plan your preparation" title="A clear path to get started." description="Explore the preparation tools, then build a practice routine that works for you." /></Reveal>
          <Reveal delay={0.1} className="mt-10"><div className="relative overflow-hidden rounded-panel border border-brand-200/80 bg-gradient-to-br from-white via-brand-50/70 to-blue-50/70 p-6 shadow-card dark:border-brand-900/80 dark:from-surface dark:via-brand-950/30 dark:to-blue-950/30 sm:p-9"><div aria-hidden="true" className="absolute -right-16 -top-28 size-72 rounded-full bg-brand-300/20 blur-3xl" /><div className="relative grid gap-7 md:grid-cols-[1fr_auto] md:items-center"><div><span className="inline-flex rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-700 dark:border-brand-800 dark:bg-brand-950/60 dark:text-brand-200">Illustrative plan outline</span><h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Start with the tools. Find your rhythm.</h3><p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">Resume insights, interview practice, and skill guidance are the building blocks of a thoughtful preparation routine.</p></div><PrimaryLink className="relative">Create your account</PrimaryLink></div><div className="relative mt-7 grid gap-3 border-t border-brand-200/70 pt-6 text-xs text-ink-muted dark:border-brand-900/80 sm:grid-cols-3"><span className="flex items-center gap-2"><Check size={14} className="text-brand-600 dark:text-brand-300" />AI-assisted preparation tools</span><span className="flex items-center gap-2"><Check size={14} className="text-brand-600 dark:text-brand-300" />Practice and review in one place</span><span className="flex items-center gap-2"><Check size={14} className="text-brand-600 dark:text-brand-300" />Plans and billing are not available yet</span></div></div></Reveal>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 px-page py-section">
        <div className="mx-auto max-w-4xl"><Reveal><SectionHeading eyebrow="Good to know" title="Questions, answered." description="A few details about the platform and what you see in this preview." /></Reveal><FAQ /></div>
      </section>

      <section className="px-page pb-16 sm:pb-24">
        <Reveal><div className="relative mx-auto max-w-6xl overflow-hidden rounded-panel border border-brand-500/20 bg-[#18112c] px-6 py-12 text-center shadow-float sm:px-12 sm:py-16"><div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(135,94,240,0.35),transparent_38%),radial-gradient(ellipse_at_85%_100%,rgba(59,130,246,0.25),transparent_40%)]" /><motion.div aria-hidden="true" animate={reduceMotion ? undefined : { rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-16 -top-28 size-72 rounded-full border border-white/10" /><div className="relative mx-auto max-w-2xl"><span className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/10 text-brand-200"><Sparkles size={21} /></span><h2 className="mt-6 font-display text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">Make your next interview a turning point.</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-violet-100/75 sm:text-base">Start building a preparation routine that helps you show up ready for what comes next.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><PrimaryLink variant="light">Get started</PrimaryLink><Link to="/login" className="inline-flex min-h-12 items-center justify-center rounded-control border border-white/20 bg-white/5 px-5 font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30">Log in</Link></div></div></div></Reveal>
      </section>
      <footer className="border-t border-border-soft px-page py-9">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-center sm:justify-between"><div><Link to="/" className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink"><span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-electric-600 text-white"><Sparkles size={15} /></span>Interview<span className="-ml-2 text-brand-600 dark:text-brand-300">Prep</span></Link><p className="mt-2 max-w-sm text-xs leading-5 text-ink-muted">A focused space to prepare for the conversations that move your career forward.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-ink-muted"><a className="hover:text-brand-700 dark:hover:text-brand-300" href="#features">Features</a><a className="hover:text-brand-700 dark:hover:text-brand-300" href="#how-it-works">How it works</a><a className="hover:text-brand-700 dark:hover:text-brand-300" href="#about">About</a><a className="hover:text-brand-700 dark:hover:text-brand-300" href="#pricing">Pricing</a><Link className="hover:text-brand-700 dark:hover:text-brand-300" to="/login">Log in</Link></nav></div>
        <div className="mx-auto mt-7 flex max-w-7xl flex-col gap-1 border-t border-border-soft pt-5 text-[10px] text-ink-subtle sm:flex-row sm:justify-between"><span>© {copyrightYear} PrepVela. All rights reserved.</span><span>Practice with purpose. Prepare with confidence.</span></div>
      </footer>
    </div>
  )
}

function Clock3Icon(props) {
  return <span aria-hidden="true" {...props}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>
}
