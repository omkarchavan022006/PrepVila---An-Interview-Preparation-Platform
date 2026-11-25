import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return <main className="grid min-h-screen place-items-center bg-canvas px-page text-center text-ink"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-300">404</p><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">We couldn’t find that page</h1><p className="mt-3 text-ink-muted">The link may be out of date, or the page may have moved.</p><Link to="/" className="mt-6 inline-flex min-h-11 items-center rounded-control border border-brand-600 bg-gradient-to-b from-brand-500 to-brand-600 px-5 font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:to-brand-700">Back to home</Link></div></main>
}
