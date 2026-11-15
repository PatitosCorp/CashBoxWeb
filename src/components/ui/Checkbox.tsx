import CheckOutlined from '@ant-design/icons-svg/es/asn/CheckOutlined'
import { useId } from 'react'
import { Icon } from './Icon'

type Props = { checked: boolean; onChange: (checked: boolean) => void; label?: string; disabled?: boolean }

export function Checkbox({ checked, onChange, label, disabled }: Props) {
  const id = useId()
  return (
    <label htmlFor={id} className={`inline-flex items-center gap-2 ${disabled ? 'cursor-not-allowed text-text-disabled' : 'cursor-pointer'}`}>
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          className="peer size-4 cursor-[inherit] appearance-none rounded-sm border border-border bg-white transition-colors checked:border-primary checked:bg-primary hover:border-primary focus-visible:outline-4 focus-visible:outline-primary/25 disabled:border-border disabled:bg-fill"
        />
        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center text-white peer-checked:flex peer-disabled:text-text-disabled">
          <Icon icon={CheckOutlined} className="size-2.5" />
        </span>
      </span>
      {label}
    </label>
  )
}
