export function Spinner({ className = 'size-3.5' }: { className?: string }) {
  return <span aria-hidden className={`${className} inline-block animate-spin rounded-full border-2 border-current border-r-transparent`} />
}
