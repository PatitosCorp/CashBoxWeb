import type { ReactNode } from 'react'

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-split bg-white shadow-card ${className}`}>
      {title ? <h2 className="border-b border-split px-6 py-4 text-base font-semibold">{title}</h2> : null}
      <div className="p-6">{children}</div>
    </section>
  )
}
