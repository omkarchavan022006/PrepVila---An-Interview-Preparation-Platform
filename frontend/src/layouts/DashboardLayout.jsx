import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  BarChart3, Bot, Braces, BriefcaseBusiness, ChevronDown, ChevronLeft, ClipboardList,
  Code2, FileSearch, FileText, LayoutDashboard, LogOut, Menu, MessageSquareText, MessageCircleMore,
  PanelLeftClose, Settings2, Target, UserRound, X,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Button from '../components/common/Button'
import ThemeToggle from '../components/common/ThemeToggle'
import { useAuth } from '../hooks/useAuth'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard, path: '/dashboard', implemented: true },
  { label: 'Resume Analyzer', icon: FileSearch, path: '/dashboard/resume-analyzer', implemented: true },
  { label: 'Job Roles', icon: BriefcaseBusiness, path: '/dashboard/jobs', implemented: true },
  { label: 'Skill Gap Analysis', icon: Target, path: '/dashboard/skill-gap-analysis', implemented: true },
  { label: 'Interview Questions', icon: MessageSquareText, path: '/dashboard/questions', implemented: true },
  { label: 'Mock Interviews', icon: ClipboardList, path: '/dashboard/interviews', implemented: true },
  { label: 'Interview Feedback', icon: BarChart3, path: '/dashboard/feedback', implemented: true },
  { label: 'Resume Builder', icon: FileText, path: '/dashboard/resume-builder', implemented: true },
  { label: 'Follow-up Questions', icon: MessageCircleMore, path: '/dashboard/follow-up-questions', implemented: true },
  { label: 'AI Chatbot', icon: Bot, path: '/dashboard/chatbot', implemented: true },
  { label: 'Coding Interview', icon: Braces, path: '/dashboard/coding-interview', implemented: true },
  { label: 'Code Debugger', icon: Code2, path: '/dashboard/code-debugger', implemented: true },
  { label: 'Settings', icon: Settings2, path: '/dashboard/settings', implemented: true },
]

function Brand({ collapsed = false, className = '', onNavigate }) {
  return (
    <Link to="/dashboard" onClick={onNavigate} className={`flex h-16 shrink-0 items-center gap-3 px-5 ${collapsed ? 'justify-center px-2' : ''} ${className}`} aria-label="PrepVela overview">
      <img src="/orange-logo.png" alt="" className="size-9 shrink-0 object-contain" />
      {!collapsed && <span className="font-semibold tracking-tight text-ink">Prep<span className="text-brand-600 dark:text-brand-300">Vela</span></span>}
    </Link>
  )
}

function NavigationItems({ collapsed = false, onNavigate }) {
  return navigation.map(({ label, icon: Icon, path, implemented }) => implemented ? (
    <NavLink key={label} to={path} end={!['/dashboard/follow-up-questions', '/dashboard/coding-interview', '/dashboard/code-debugger', '/dashboard/settings'].includes(path)} onClick={onNavigate} title={collapsed ? label : undefined} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-semibold transition-colors duration-quick focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 ${collapsed ? 'justify-center px-0' : ''} ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'}`}>
      <Icon aria-hidden="true" size={18} className="shrink-0" />
      {!collapsed && <><span>{label}</span><ChevronLeft aria-hidden="true" size={14} className="ml-auto rotate-180 opacity-50" /></>}
    </NavLink>
  ) : (
    <div key={label} aria-disabled="true" title={`${label} — coming soon`} className={`flex min-h-11 cursor-not-allowed items-center gap-3 rounded-control px-3 text-sm font-medium text-ink-subtle ${collapsed ? 'justify-center px-0' : ''}`}>
      <Icon aria-hidden="true" size={18} className="shrink-0 opacity-70" />
      {!collapsed && <><span className="min-w-0 flex-1 truncate">{label}</span><span className="rounded-full border border-border-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Soon</span></>}
    </div>
  ))
}

export default function DashboardLayout() {
  const { user, logout, sessionValidationError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const profileRef = useRef(null)
  const mobileDialogRef = useRef(null)
  const mobileTriggerRef = useRef(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const pageTitle = location.pathname.startsWith('/dashboard/settings')
    ? 'Settings'
    : location.pathname.startsWith('/dashboard/coding-interview')
    ? 'Coding Interview'
    : location.pathname.startsWith('/dashboard/code-debugger')
      ? 'Code Debugger'
    : location.pathname.startsWith('/dashboard/chatbot')
    ? 'AI Chatbot'
    : location.pathname.startsWith('/dashboard/follow-up-questions')
      ? 'Follow-up Questions'
    : location.pathname.startsWith('/dashboard/resume-analyzer')
    ? 'Resume Analyzer'
    : location.pathname.startsWith('/dashboard/resume-builder')
      ? 'Resume Builder'
    : location.pathname.startsWith('/dashboard/jobs')
      ? 'Job Roles'
      : location.pathname.startsWith('/dashboard/skill-gap-analysis')
        ? 'Skill Gap Analysis'
        : location.pathname.startsWith('/dashboard/questions')
          ? 'Interview Questions'
          : location.pathname.startsWith('/dashboard/interviews')
            ? 'Mock Interviews'
            : location.pathname.startsWith('/dashboard/feedback')
              ? 'Interview Feedback'
        : 'Overview'

  useEffect(() => {
    if (sessionValidationError) toast.warning(sessionValidationError)
  }, [sessionValidationError])

  useEffect(() => {
    if (!mobileOpen && !profileOpen) return undefined
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        setProfileOpen(false)
      }
    }
    function closeOnOutside(event) {
      if (profileOpen && !profileRef.current?.contains(event.target)) setProfileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutside)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutside)
    }
  }, [mobileOpen, profileOpen])

  useEffect(() => {
    if (!mobileOpen) return undefined
    const dialog = mobileDialogRef.current
    const trigger = mobileTriggerRef.current
    const focusable = () => [...(dialog?.querySelectorAll('button:not([disabled]), a[href]') || [])]
    focusable()[0]?.focus()
    function trapKeyboard(event) {
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trapKeyboard)
    return () => {
      document.removeEventListener('keydown', trapKeyboard)
      trigger?.focus()
    }
  }, [mobileOpen])

  async function handleLogout() {
    try {
      await logout()
      toast.success('You have been logged out.')
    } catch {
      toast.error('The session was cleared, but the server could not confirm logout.')
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const initials = user?.name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-canvas text-ink lg:flex">
      <motion.aside animate={{ width: collapsed ? 84 : 272 }} transition={{ duration: reduceMotion ? 0 : 0.24 }} className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border-soft bg-surface/90 lg:flex">
        <div className="flex items-center justify-between border-b border-border-soft/80 pr-3">
          <Brand collapsed={collapsed} />
          <button type="button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed((value) => !value)} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60"><PanelLeftClose size={16} className={collapsed ? 'rotate-180' : ''} /></button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-4">
          {!collapsed && <div className="mb-2 px-5 pb-2 text-2xs font-bold uppercase tracking-[0.14em] text-ink-subtle">Workspace</div>}
          <nav aria-label="Dashboard navigation" className="grid gap-1 px-3"><NavigationItems collapsed={collapsed} /></nav>
          <div className="mt-auto px-3 pt-5">
            {!collapsed && <div className="mb-3 rounded-card border border-brand-100 bg-gradient-to-br from-brand-50 to-blue-50/70 p-4 dark:border-brand-900/70 dark:from-brand-950/60 dark:to-blue-950/30"><p className="text-sm font-semibold text-ink">Your next step</p><p className="mt-1 text-xs leading-5 text-ink-muted">Build steady practice habits and track your progress here.</p></div>}
            <div title={collapsed ? `${user?.name || ''} · ${user?.email || ''}` : undefined} className={`flex items-center gap-3 rounded-control border border-border-soft bg-surface-muted/70 p-2.5 ${collapsed ? 'justify-center' : ''}`}>
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-200 to-blue-200 text-xs font-bold text-brand-800 dark:from-brand-800 dark:to-blue-900 dark:text-white">{initials}</span>
              {!collapsed && <div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">{user?.name}</p><p className="truncate text-2xs text-ink-muted">{user?.email}</p></div>}
            </div>
          </div>
        </div>
      </motion.aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-border-soft/80 bg-canvas/85 backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button ref={mobileTriggerRef} type="button" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="mobile-dashboard-navigation" onClick={() => setMobileOpen(true)} className="grid size-10 shrink-0 place-items-center rounded-control border border-border-soft bg-surface text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 lg:hidden"><Menu size={18} /></button>
              <div className="min-w-0"><p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">Interview preparation</p><p className="truncate text-sm font-semibold text-ink sm:text-base">{pageTitle}</p></div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <div className="relative" ref={profileRef}>
                <button type="button" aria-label="Open profile menu" aria-expanded={profileOpen} aria-haspopup="true" aria-controls="dashboard-profile-menu" onClick={() => setProfileOpen((open) => !open)} className="flex min-h-10 items-center gap-2 rounded-control px-2 text-left transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 sm:px-3">
                  <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-brand-200 to-blue-200 text-[11px] font-bold text-brand-800 dark:from-brand-800 dark:to-blue-900 dark:text-white">{initials}</span>
                  <span className="hidden max-w-36 truncate text-sm font-medium text-ink-muted md:block">{user?.name}</span><ChevronDown size={14} className="text-ink-subtle" />
                </button>
                <AnimatePresence>
                  {profileOpen && <motion.div id="dashboard-profile-menu" initial={{ opacity: 0, y: 5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5 }} transition={{ duration: reduceMotion ? 0 : 0.14 }} className="absolute right-0 top-full z-40 mt-2 w-64 rounded-card border border-border-soft bg-surface p-2 shadow-float">
                    <div className="border-b border-border-soft px-3 py-2"><p className="truncate text-sm font-semibold text-ink">{user?.name || 'Your account'}</p><p className="truncate text-xs text-ink-muted">{user?.email}</p></div>
                    <div className="mt-1 px-3 py-2 text-xs text-ink-subtle"><UserRound aria-hidden="true" size={14} className="mr-2 inline" />Signed in</div>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/40" onClick={handleLogout}><LogOut size={16} />Log out</Button>
                  </motion.div>}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          <AnimatePresence mode="wait" initial={false}><motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}><Outlet /></motion.div></AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden" id="mobile-dashboard-navigation">
          <motion.button type="button" aria-label="Close navigation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} className="absolute inset-0 h-full w-full cursor-default bg-slate-950/55 backdrop-blur-[2px]" />
          <motion.aside ref={mobileDialogRef} role="dialog" aria-modal="true" aria-label="Dashboard navigation" initial={{ x: reduceMotion ? 0 : -24, opacity: 0.8 }} animate={{ x: 0, opacity: 1 }} exit={{ x: reduceMotion ? 0 : -24, opacity: 0.8 }} transition={{ duration: reduceMotion ? 0 : 0.22 }} className="absolute inset-y-0 left-0 flex w-[min(88vw,22rem)] flex-col border-r border-border-soft bg-surface shadow-float">
            <div className="flex h-16 items-center justify-between border-b border-border-soft pr-3"><Brand onNavigate={() => setMobileOpen(false)} /><button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60"><X size={18} /></button></div>
            <div className="min-h-0 flex-1 overflow-y-auto py-4"><div className="mb-2 px-5 pb-2 text-2xs font-bold uppercase tracking-[0.14em] text-ink-subtle">Workspace</div><nav aria-label="Mobile dashboard navigation" className="grid gap-1 px-3"><NavigationItems onNavigate={() => setMobileOpen(false)} /></nav></div>
            <div className="border-t border-border-soft p-4"><div className="mb-3 flex items-center gap-3 rounded-control bg-surface-muted p-3"><span aria-hidden="true" className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-200 to-blue-200 text-xs font-bold text-brand-800 dark:from-brand-800 dark:to-blue-900 dark:text-white">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-xs text-ink-muted">{user?.email}</p></div></div><Button variant="outline" className="w-full" onClick={handleLogout}><LogOut size={16} />Log out</Button></div>
          </motion.aside>
        </div>}
      </AnimatePresence>
    </div>
  )
}
