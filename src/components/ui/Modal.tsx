import CloseOutlined from '@ant-design/icons-svg/es/asn/CloseOutlined'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

type Props = { open: boolean; title?: string; onClose: () => void; footer?: ReactNode; children: ReactNode }

// antd Modal rendered through a portal; Escape and mask click close it.
export function Modal({ open, title, onClose, footer, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-mask p-0 sm:items-center sm:p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="flex max-h-[90dvh] w-full flex-col rounded-t-lg bg-white shadow-modal outline-none sm:max-w-[520px] sm:rounded-lg"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose} className="rounded p-1 text-text-tertiary hover:bg-fill hover:text-text">
            <Icon icon={CloseOutlined} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-3">{children}</div>
        {footer ? <div className="flex justify-end gap-2 px-6 pt-2 pb-5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
