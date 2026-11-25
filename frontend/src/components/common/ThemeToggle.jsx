import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  return (
    <motion.button type="button" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} mode`} title={`Switch to ${nextTheme} mode`} whileTap={{ rotate: 12, scale: 0.92 }} transition={{ duration: 0.18 }} className={`inline-flex size-10 items-center justify-center rounded-control border border-transparent text-ink-muted transition-colors duration-quick hover:border-border-soft hover:bg-surface-muted hover:text-brand-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200/60 dark:hover:text-brand-300 motion-reduce:transform-none ${className}`}>
      {theme === 'dark' ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
    </motion.button>
  )
}
