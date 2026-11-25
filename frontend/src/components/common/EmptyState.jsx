import { Inbox } from 'lucide-react'
import { motion } from 'framer-motion'

export default function EmptyState({ title = 'Nothing here yet', description, action, icon: Icon = Inbox }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-panel border border-brand-100 bg-gradient-to-br from-brand-50 to-blue-50 text-brand-600 shadow-soft dark:border-brand-900 dark:from-brand-900/40 dark:to-blue-950/40 dark:text-brand-200"><Icon aria-hidden="true" size={23} /></span>
      <h3 className="text-base font-semibold tracking-tight text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
