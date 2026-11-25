import { forwardRef, useId } from 'react'

const Textarea = forwardRef(function Textarea({ label, error, hint, className = '', id, ...props }, ref) {
  const generatedId = useId()
  const inputId = id || generatedId
  const messageId = `${inputId}-message`
  return (
    <div className="grid gap-2">
      {label && <label htmlFor={inputId} className="text-sm font-semibold tracking-[-0.01em] text-ink-secondary">{label}</label>}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={`min-h-32 w-full resize-y rounded-control border border-border-strong/80 bg-surface px-4 py-3.5 text-sm leading-6 text-ink shadow-sm outline-none transition-all duration-quick placeholder:text-ink-muted/70 hover:border-brand-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-200/40 aria-[invalid=true]:border-rose-500 aria-[invalid=true]:focus:ring-rose-200/40 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 dark:focus:ring-brand-500/20 ${className}`}
        {...props}
      />
      {(error || hint) && <p id={messageId} className={`text-xs leading-5 ${error ? 'text-rose-600 dark:text-rose-300' : 'text-ink-muted'}`}>{error || hint}</p>}
    </div>
  )
})

export default Textarea
