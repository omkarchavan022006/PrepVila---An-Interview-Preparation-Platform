import { motion } from 'framer-motion'

export default function Card({ as = 'section', interactive = false, className = '', children, ...props }) {
  const Component = as === 'article' ? motion.article : as === 'div' ? motion.div : motion.section
  return <Component whileHover={interactive ? { y: -3 } : undefined} transition={{ duration: 0.2 }} className={`rounded-card border border-border-soft bg-surface p-6 shadow-card transition-[border-color,box-shadow] duration-standard ${interactive ? 'hover:border-brand-200 hover:shadow-float dark:hover:border-brand-800' : ''} ${className}`} {...props}>{children}</Component>
}
