import { useState } from 'react'
import { Check, LogOut, Moon, Sun, UserRound, Bell, ShieldCheck, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'

const themes = [
  { value: 'light', label: 'Light', description: 'Bright surfaces and dark text', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Deep surfaces and light text', icon: Moon },
]

export default function SettingsPage() {
  const { user, logout, sessionValidationError, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function verifyProfile() {
    setRefreshing(true)
    try {
      await refreshProfile()
      toast.success('Profile information refreshed.')
    } catch {
      toast.error('Profile information could not be refreshed. Your saved session was kept unless the server rejected it.')
    } finally { setRefreshing(false) }
  }

  async function handleLogout() {
    if (!window.confirm('Log out of your PrepVela account on this browser?')) return
    setLoggingOut(true)
    try {
      await logout()
      toast.success('You have been logged out.')
      navigate('/login', { replace: true })
    } catch {
      toast.error('Your local session was cleared, but the server could not confirm token revocation.')
      navigate('/login', { replace: true })
    } finally { setLoggingOut(false) }
  }

  return <div className="mx-auto max-w-4xl">
    <header className="mb-7"><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Preferences and account</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Settings</h1><p className="mt-2 text-sm leading-6 text-ink-muted">Manage the preferences supported by this application.</p></header>

    <div className="grid gap-5">
      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200"><UserRound size={19} /></span><div><h2 className="font-semibold text-ink">Profile</h2><p className="mt-1 text-sm text-ink-muted">Account details returned by your profile endpoint.</p></div></div>
        {sessionValidationError && <div role="status" className="mb-4 flex flex-col gap-3 rounded-control border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between"><p>{sessionValidationError} The information below may be from the last successful verification.</p><Button variant="outline" size="sm" loading={refreshing} onClick={verifyProfile}><RefreshCw size={14} />Retry verification</Button></div>}
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 rounded-control border border-border-soft bg-surface-muted/50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Name</dt><dd className="mt-1.5 break-words text-sm font-medium text-ink">{user?.name || 'Not returned by profile'}</dd></div>
          <div className="min-w-0 rounded-control border border-border-soft bg-surface-muted/50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Email</dt><dd className="mt-1.5 break-all text-sm font-medium text-ink">{user?.email || 'Not returned by profile'}</dd></div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-ink-muted">The backend supports profile retrieval only. Profile editing is not available.</p>
        {!sessionValidationError && <div className="mt-4"><Button variant="outline" size="sm" loading={refreshing} onClick={verifyProfile}><RefreshCw size={14} />Refresh profile</Button></div>}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200">{theme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}</span><div><h2 className="font-semibold text-ink">Appearance</h2><p className="mt-1 text-sm text-ink-muted">Choose the theme used throughout the application. Your choice is saved on this browser.</p></div></div>
        <div role="group" aria-label="Color theme" className="grid gap-3 sm:grid-cols-2">{themes.map(({ value, label, description, icon: Icon }) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)} className={`flex min-h-20 items-center gap-3 rounded-card border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 ${theme === value ? 'border-brand-400 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-950/40' : 'border-border-soft bg-surface hover:border-brand-200 hover:bg-surface-muted dark:hover:border-brand-800'}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-brand-700 dark:text-brand-200"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink">{label}</span><span className="mt-0.5 block text-xs text-ink-muted">{description}</span></span>{theme === value && <Check aria-label="Selected" size={17} className="shrink-0 text-brand-700 dark:text-brand-200" />}</button>)}</div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-ink-muted"><ShieldCheck size={19} /></span><div><h2 className="font-semibold text-ink">Account and session</h2><p className="mt-1 text-sm text-ink-muted">Your session is managed by the existing sign-in system for this browser.</p></div></div>
        <div className="rounded-control border border-border-soft bg-surface-muted/50 p-4"><p className="text-sm font-medium text-ink">Signed in as {user?.email || 'your account'}</p><p className="mt-1 text-xs leading-5 text-ink-muted">The current session is stored in this browser using the app’s existing token storage. There is no password-change or account-deletion endpoint.</p></div>
        <Button variant="danger" className="mt-4" loading={loggingOut} onClick={handleLogout}><LogOut size={16} />Log out</Button>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="mb-3 flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-ink-muted"><Bell size={19} /></span><div><h2 className="font-semibold text-ink">Notifications</h2><p className="mt-1 text-sm text-ink-muted">No notification preferences are currently available.</p></div></div>
        <p className="text-sm leading-6 text-ink-muted">The backend does not expose notification settings or a preference persistence service, so there are no switches here that could imply saved notification behavior.</p>
      </Card>
    </div>
  </div>
}
