import { forwardRef, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  size?: 'small' | 'middle' | 'large'
  status?: 'error'
}

const sizes = { small: 'h-6 px-[7px] rounded-sm', middle: 'h-8 px-[11px] rounded', large: 'h-10 px-[11px] rounded-lg text-base' }

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { size = 'middle', status, className = '', ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      {...rest}
      aria-invalid={status === 'error' || undefined}
      className={[
        'w-full border bg-white text-text placeholder:text-text-disabled transition-colors outline-none',
        status === 'error'
          ? 'border-error hover:border-error-hover focus:shadow-[0_0_0_2px_rgb(255_38_5/0.06)]'
          : 'border-border hover:border-primary-hover focus:border-primary focus:shadow-[0_0_0_2px_rgb(5_145_255/0.1)]',
        'disabled:cursor-not-allowed disabled:bg-fill disabled:text-text-disabled disabled:hover:border-border',
        sizes[size],
        className,
      ].join(' ')}
    />
  )
})
