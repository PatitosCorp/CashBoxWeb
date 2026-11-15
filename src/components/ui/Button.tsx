import type { IconDefinition } from '@ant-design/icons-svg/lib/types'
import type { ButtonHTMLAttributes } from 'react'
import { Icon } from './Icon'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'default' | 'dashed' | 'text' | 'link'
type Size = 'small' | 'middle' | 'large'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  variant?: Variant
  size?: Size
  danger?: boolean
  loading?: boolean
  icon?: IconDefinition
  block?: boolean
  htmlType?: 'button' | 'submit'
}

const sizes: Record<Size, string> = {
  small: 'h-6 px-[7px] rounded-sm text-sm',
  middle: 'h-8 px-[15px] rounded',
  large: 'h-10 px-[15px] rounded-lg text-base',
}

// antd v5 button styles.
const variants = (danger?: boolean): Record<Variant, string> =>
  danger
    ? {
        primary: 'bg-error text-white border-error hover:bg-error-hover hover:border-error-hover',
        default: 'bg-white text-error border-error hover:text-error-hover hover:border-error-hover',
        dashed: 'bg-white text-error border-error border-dashed hover:text-error-hover hover:border-error-hover',
        text: 'border-transparent text-error hover:bg-error-bg',
        link: 'border-transparent text-error hover:text-error-hover',
      }
    : {
        primary: 'bg-primary text-white border-primary hover:bg-primary-hover hover:border-primary-hover active:bg-primary-active',
        default: 'bg-white text-text border-border hover:text-primary-hover hover:border-primary-hover active:text-primary-active',
        dashed: 'bg-white text-text border-border border-dashed hover:text-primary-hover hover:border-primary-hover',
        text: 'border-transparent text-text hover:bg-fill',
        link: 'border-transparent text-primary hover:text-primary-hover',
      }

export function Button({
  variant = 'default',
  size = 'middle',
  danger,
  loading,
  icon,
  block,
  htmlType = 'button',
  disabled,
  className = '',
  children,
  ...rest
}: Props) {
  const isDisabled = disabled || loading
  return (
    <button
      {...rest}
      type={htmlType}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        'inline-flex items-center justify-center gap-2 border font-normal whitespace-nowrap transition-colors',
        'focus-visible:outline-4 focus-visible:outline-primary/25 focus-visible:outline-offset-1',
        'disabled:cursor-not-allowed disabled:bg-fill disabled:text-text-disabled disabled:border-border',
        sizes[size],
        variants(danger)[variant],
        block ? 'w-full' : '',
        !children ? 'aspect-square px-0' : '',
        className,
      ].join(' ')}
    >
      {loading ? <Spinner /> : icon ? <Icon icon={icon} /> : null}
      {children}
    </button>
  )
}
