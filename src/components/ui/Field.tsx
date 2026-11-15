import type { ReactNode } from 'react'

type Props = { label: string; htmlFor?: string; error?: string; required?: boolean; children: ReactNode }

// antd Form.Item (vertical layout).
export function Field({ label, htmlFor, error, required, children }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-text">
        {required ? <span className="me-1 text-error">*</span> : null}
        {label}
      </label>
      {children}
      {error ? <span role="alert" className="-mt-1 text-error">{error}</span> : null}
    </div>
  )
}
