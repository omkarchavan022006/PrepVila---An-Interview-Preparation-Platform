import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import ThemeToggle from '../components/common/ThemeToggle'

const sections = [
  ['Features', 'features'],
  ['How it works', 'how-it-works'],
  ['About', 'about'],
  ['Pricing', 'pricing'],
]

export default function PublicLayout() {
  const location = useLocation()
  const isLanding = location.pathname === '/'
  const [openMenuAt, setOpenMenuAt] = useState(null)
  const menuOpen = openMenuAt === location.pathname
  const [scrolled, setScrolled] = useState(() => window.scrollY > 12)

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', updateScroll, { passive: true })
    return () => window.removeEventListener('scroll', updateScroll)
  }, [])

  const closeMenu = () => setOpenMenuAt(null)

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-canvas text-ink">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(ellipse_at_48%_-18%,rgba(152,116,255,0.18),transparent_63%)] dark:bg-[radial-gradient(ellipse_at_48%_-18%,rgba(79,62,142,0.3),transparent_63%)]" />
      <header className={`sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-standard ${scrolled ? 'border-border-soft bg-canvas/95 shadow-soft backdrop-blur-2xl' : 'border-transparent bg-canvas/75 backdrop-blur-xl'}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-page py-3">
          <Link to="/" onClick={closeMenu} aria-label="PrepVela home" className="group inline-flex items-center gap-2.5 rounded-lg font-semibold tracking-tight text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60">
            <img src="/orange-logo.png" alt="" className="size-9 shrink-0 object-contain transition-transform duration-quick group-hover:scale-105" />
            <span className="text-[0.95rem]">Prep<span className="text-brand-600 dark:text-brand-300">Vela</span></span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {isLanding && sections.map(([label, id]) => <a key={id} href={`#${id}`} className="rounded-control px-3 py-2.5 text-[13px] font-medium text-ink-muted transition-colors duration-quick hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60">{label}</a>)}
            <span className="mx-2 h-5 w-px bg-border-soft" aria-hidden="true" />
            <ThemeToggle className="size-9" />
            <Link className="rounded-control px-3.5 py-2.5 text-sm font-semibold text-ink-muted transition-colors duration-quick hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60" to="/login">Login</Link>
            <Link className="ml-1 inline-flex min-h-10 items-center rounded-control border border-brand-600 bg-gradient-to-b from-brand-500 to-brand-600 px-4 text-sm font-semibold text-white shadow-soft transition-all duration-quick hover:-translate-y-0.5 hover:from-brand-500 hover:to-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/70" to="/register">Get started</Link>
          </nav>
          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle className="size-9" />
            <button type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setOpenMenuAt(menuOpen ? null : location.pathname)} className="grid size-10 place-items-center rounded-control border border-border-soft bg-surface text-ink-muted transition hover:border-brand-200 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:hover:text-brand-300">
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {menuOpen && <motion.nav id="mobile-navigation" aria-label="Mobile navigation" initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-border-soft bg-canvas/98 px-page backdrop-blur-xl lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-1 py-3">
              {isLanding && sections.map(([label, id]) => <a key={id} href={`#${id}`} onClick={closeMenu} className="rounded-xl px-3 py-3 text-sm font-medium text-ink-secondary transition hover:bg-surface-muted hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:hover:text-brand-300">{label}</a>)}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border-soft pt-3"><Link onClick={closeMenu} to="/login" className="inline-flex min-h-11 items-center justify-center rounded-control border border-border-soft text-sm font-semibold text-ink-secondary transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">Login</Link><Link onClick={closeMenu} to="/register" className="inline-flex min-h-11 items-center justify-center rounded-control bg-gradient-to-b from-brand-500 to-brand-600 text-sm font-semibold text-white shadow-soft transition hover:from-brand-500 hover:to-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/70">Get started</Link></div>
            </div>
          </motion.nav>}
        </AnimatePresence>
      </header>
      <main>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
