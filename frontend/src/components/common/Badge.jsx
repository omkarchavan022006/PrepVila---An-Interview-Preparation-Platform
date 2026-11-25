const tones = {
  neutral: 'border-border-soft bg-surface-muted text-ink-muted',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
  danger: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300',
  violet: 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-200',
}

export default function Badge({ tone = 'neutral', className = '', children, ...props }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-2xs font-semibold tracking-wide ${tones[tone] || tones.neutral} ${className}`} {...props}>{children}</span>
}
