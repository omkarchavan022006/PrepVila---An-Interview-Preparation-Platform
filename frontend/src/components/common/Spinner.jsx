export default function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  const dimensions = size === 'sm' ? 'size-4 border-2' : size === 'lg' ? 'size-9 border-[3px]' : 'size-6 border-2'
  return <span role="status" aria-label={label} className={`inline-block animate-spin rounded-full border-brand-500 border-r-transparent motion-reduce:animate-none ${dimensions} ${className}`} />
}
