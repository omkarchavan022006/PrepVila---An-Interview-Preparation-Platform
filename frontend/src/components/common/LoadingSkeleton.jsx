export default function LoadingSkeleton({ className = 'h-5 w-full', rounded = 'rounded-lg', ...props }) {
  return <div aria-hidden="true" className={`animate-pulse bg-gradient-to-r from-surface-muted via-brand-50 to-surface-muted dark:via-brand-900/30 motion-reduce:animate-none ${rounded} ${className}`} {...props} />
}
