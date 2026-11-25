import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Activity, Award, BarChart3, BriefcaseBusiness, CheckCircle2, CircleHelp,
  ClipboardCheck, FileSearch, Target, TrendingUp,
} from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart,
} from 'recharts'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import Badge from '../../components/common/Badge'
import Card from '../../components/common/Card'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import LoadingSkeleton from '../../components/common/LoadingSkeleton'
import { getDashboardOverview } from '../../api/dashboardApi'
import { useAuth } from '../../hooks/useAuth'

const metrics = [
  ['total_interviews', 'Total interviews', BriefcaseBusiness, 'count'],
  ['completed_interviews', 'Completed', CheckCircle2, 'count'],
  ['in_progress_interviews', 'In progress', Activity, 'count'],
  ['average_score', 'Average score', TrendingUp, 'score'],
  ['highest_score', 'Highest score', Award, 'score'],
]

const quickActions = [
  { label: 'Upload Resume', description: 'Analyze an existing resume', icon: FileSearch, to: '/dashboard/resume-analyzer' },
  { label: 'Start Mock Interview', description: 'Practice an interview session', icon: ClipboardCheck, to: '/dashboard/interviews' },
  { label: 'Generate Questions', description: 'Prepare role-specific questions', icon: CircleHelp, to: '/dashboard/questions' },
  { label: 'Analyze Skills', description: 'Explore skill readiness', icon: Target, to: '/dashboard/skill-gap-analysis' },
]

function getErrorMessage(error) {
  return error.response?.data?.error || error.response?.data?.detail || 'Could not load your dashboard right now. Please try again.'
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function formatScore(value) {
  return typeof value === 'number' ? `${value}%` : '—'
}

function ChartTooltip({ active, payload, label, valueLabel = 'Score' }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-control border border-border-soft bg-surface px-3 py-2 shadow-float"><p className="text-xs font-medium text-ink-muted">{label}</p><p className="mt-1 text-sm font-semibold text-ink">{valueLabel}: {payload[0].value}%</p></div>
}

export default function DashboardPage() {
  const { user } = useAuth()
  const reduceMotion = useReducedMotion()
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await getDashboardOverview()
      setOverview(data)
      return true
    } catch (requestError) {
      setError(getErrorMessage(requestError))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getDashboardOverview()
      .then(({ data }) => { if (active) setOverview(data) })
      .catch((requestError) => { if (active) setError(getErrorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const statistics = overview?.statistics || {}
  const performance = useMemo(() => (Array.isArray(overview?.performance_chart) ? overview.performance_chart : []).map((item) => ({
    ...item,
    chart_date: formatDate(item.date),
  })), [overview])
  const questionPerformance = Array.isArray(overview?.question_performance) ? overview.question_performance : []
  const recentHistory = Array.isArray(overview?.recent_history) ? overview.recent_history : []
  const isNewUser = !loading && !error && overview && (statistics.total_interviews ?? 0) === 0 && recentHistory.length === 0 && performance.length === 0 && questionPerformance.length === 0

  async function handleRetry() {
    if (await load()) toast.success('Dashboard refreshed.')
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-9">
        <div><Badge tone="violet">Your workspace</Badge><h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Good to see you, {user?.name?.trim().split(/\s+/)[0] || 'there'}.</h1><p className="mt-2 text-sm leading-6 text-ink-muted sm:text-base">Your interview preparation overview.</p></div>
        {overview?.message && <p className="hidden text-xs text-ink-subtle md:block">Updated from your interview activity</p>}
      </div>

      {error ? <Card><ErrorState title="Dashboard unavailable" message={error} onRetry={handleRetry} /></Card> : <>
        <section aria-label="Interview statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map(([key, label, Icon, type], index) => <motion.div key={key} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.22, delay: reduceMotion ? 0 : index * 0.035 }}><Card interactive className="h-full p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-ink-muted">{label}</span><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-blue-50 text-brand-600 dark:from-brand-950/70 dark:to-blue-950/50 dark:text-brand-300"><Icon aria-hidden="true" size={18} /></span></div>{loading ? <LoadingSkeleton className="mt-4 h-8 w-24" /> : <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink">{type === 'score' ? formatScore(statistics[key]) : typeof statistics[key] === 'number' ? statistics[key] : '—'}</p>}</Card></motion.div>)}
        </section>

        {isNewUser && <Card className="mt-5"><EmptyState title="Your interview dashboard is ready" description="Your interview counts, performance charts, and recent sessions will appear here after you complete your first mock interview." icon={BriefcaseBusiness} /></Card>}

        <section aria-label="Performance charts" className="mt-5 grid gap-5 xl:grid-cols-2">
          <Card className="min-w-0 p-0"><div className="flex items-start justify-between gap-3 border-b border-border-soft px-5 py-4 sm:px-6"><div><h2 className="font-semibold tracking-tight text-ink">Interview performance</h2><p className="mt-1 text-sm text-ink-muted">Scores from completed interviews.</p></div><span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-200"><TrendingUp aria-hidden="true" size={17} /></span></div>
            {loading ? <div className="grid gap-3 p-5"><LoadingSkeleton className="h-56 w-full" /></div> : performance.length ? <div className="h-64 px-2 pb-3 pt-5 sm:px-4" role="img" aria-label="Line chart of completed interview scores over time"><ResponsiveContainer width="100%" height="100%"><LineChart data={performance} margin={{ top: 8, right: 14, bottom: 2, left: -18 }}><CartesianGrid stroke="var(--border-soft)" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="chart_date" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} minTickGap={20} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} /><Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="score" name="Score" stroke="#8055e8" strokeWidth={2.5} dot={{ r: 3, fill: '#8055e8', strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div> : <EmptyState title="No performance data yet" description="Completed interview scores will appear here." icon={BarChart3} />}
          </Card>

          <Card className="min-w-0 p-0"><div className="flex items-start justify-between gap-3 border-b border-border-soft px-5 py-4 sm:px-6"><div><h2 className="font-semibold tracking-tight text-ink">Question performance</h2><p className="mt-1 text-sm text-ink-muted">Average scores grouped by topic.</p></div><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"><BarChart3 aria-hidden="true" size={17} /></span></div>
            {loading ? <div className="grid gap-3 p-5"><LoadingSkeleton className="h-56 w-full" /></div> : questionPerformance.length ? <div className="h-64 px-2 pb-3 pt-5 sm:px-4" role="img" aria-label="Bar chart of average scores by question topic"><ResponsiveContainer width="100%" height="100%"><BarChart data={questionPerformance} margin={{ top: 8, right: 10, bottom: 2, left: -18 }}><CartesianGrid stroke="var(--border-soft)" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="topic" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-muted)', fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={52} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-muted)', fontSize: 11 }} /><Tooltip content={<ChartTooltip valueLabel="Average" />} /><Bar dataKey="average_score" name="Average score" fill="#3478eb" radius={[6, 6, 0, 0]} maxBarSize={44} /></BarChart></ResponsiveContainer></div> : <EmptyState title="No topic scores yet" description="Question topic results will appear after completed interview evaluations." icon={BarChart3} />}
          </Card>
        </section>

        <section aria-label="Recent interview history" className="mt-5"><Card className="overflow-hidden p-0"><div className="flex items-center justify-between gap-3 border-b border-border-soft px-5 py-4 sm:px-6"><div><h2 className="font-semibold tracking-tight text-ink">Recent practice</h2><p className="mt-1 text-sm text-ink-muted">Your latest interview sessions.</p></div><Badge>{recentHistory.length} shown</Badge></div>
          {loading ? <div className="grid gap-3 p-5 sm:p-6"><LoadingSkeleton className="h-14" /><LoadingSkeleton className="h-14" /></div> : recentHistory.length ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-ink-subtle"><tr><th scope="col" className="px-5 py-3 sm:px-6">Interview</th><th scope="col" className="px-4 py-3">Difficulty</th><th scope="col" className="px-4 py-3">Questions</th><th scope="col" className="px-4 py-3">Score</th><th scope="col" className="px-5 py-3 sm:px-6">Date</th></tr></thead><tbody className="divide-y divide-border-soft">{recentHistory.map((item) => <tr key={item.interview_id} className="transition-colors hover:bg-surface-muted/50"><th scope="row" className="max-w-64 px-5 py-4 font-medium text-ink sm:px-6"><span className="block truncate">{item.job_title || 'Interview practice'}</span><span className="mt-1 block text-xs font-normal capitalize text-ink-muted">{item.status || 'Status unavailable'}</span></th><td className="px-4 py-4 capitalize text-ink-muted">{item.difficulty || '—'}</td><td className="px-4 py-4 text-ink-muted">{typeof item.total_questions === 'number' ? item.total_questions : '—'}</td><td className="px-4 py-4 font-semibold text-ink">{formatScore(item.total_score)}</td><td className="px-5 py-4 text-ink-muted sm:px-6">{formatDate(item.completed_at || item.created_at)}</td></tr>)}</tbody></table></div> : <EmptyState title="No recent interviews" description="Once you have interview sessions, your latest activity will be listed here." icon={BriefcaseBusiness} />}
        </Card></section>

        <section aria-label="Quick actions" className="mt-8"><div className="mb-4"><h2 className="font-semibold tracking-tight text-ink">Quick actions</h2><p className="mt-1 text-sm text-ink-muted">Jump into a preparation tool.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{quickActions.map(({ label, description, icon: Icon, to }) => <Link key={label} to={to} className="flex min-h-24 items-start gap-3 rounded-card border border-border-soft bg-surface p-4 transition-colors hover:border-brand-200 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:hover:border-brand-800"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300"><Icon aria-hidden="true" size={19} /></span><span className="min-w-0"><span className="block text-sm font-semibold text-ink">{label}</span><span className="mt-1 block text-xs leading-5 text-ink-muted">{description}</span></span></Link>)}</div></section>
      </>}
    </div>
  )
}
