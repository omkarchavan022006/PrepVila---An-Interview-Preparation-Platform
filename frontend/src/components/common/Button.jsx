import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Spinner from './Spinner'

const MotionLink = motion.create(Link)

const variants = {
  primary: 'border border-brand-600 bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-[0_8px_20px_-9px_rgb(91_50_184_/_0.8)] hover:from-brand-500 hover:to-brand-700 active:from-brand-700 active:to-brand-700',
  secondary: 'border border-border-soft bg-surface-muted text-ink hover:border-border-strong hover:bg-surface',
  outline: 'border border-border-strong bg-transparent text-ink-secondary hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30',
  ghost: 'border border-transparent bg-transparent text-ink-secondary hover:bg-surface-muted hover:text-ink',
  danger: 'border border-rose-700 bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800',
}

const sizes = { sm: 'min-h-9 px-3 text-xs', md: 'min-h-11 px-4 text-sm', lg: 'min-h-12 px-5 text-sm' }

const Button = forwardRef(function Button({ as, variant = 'primary', size = 'md', loading = false, disabled, className = '', children, onClick, ...props }, ref) {
  const Component = as === Link ? MotionLink : motion.button
  const unavailable = Boolean(disabled || loading)
  return (
    <Component
      ref={ref}
      {...(as === Link ? { 'aria-disabled': unavailable || undefined, onClick: unavailable ? (event) => event.preventDefault() : onClick } : { disabled: unavailable, onClick })}
      whileHover={!unavailable ? { y: -1 } : undefined}
      whileTap={!unavailable ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.16 }}
      className={`inline-flex items-center justify-center gap-2 rounded-control py-2 font-semibold transition-all duration-quick ease-standard focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" label="Loading" />}
      {children}
    </Component>
  )
})

export default Button
