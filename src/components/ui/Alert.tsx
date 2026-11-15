import type { ReactNode } from 'react'

const styles = {
  info: 'bg-primary-bg border-primary/30',
  success: 'bg-success-bg border-success/30',
  warning: 'bg-warning-bg border-warning/30',
  error: 'bg-error-bg border-error/30',
}

export function Alert({ type = 'info', children }: { type?: keyof typeof styles; children: ReactNode }) {
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 ${styles[type]}`}>
      {children}
    </div>
  )
}
