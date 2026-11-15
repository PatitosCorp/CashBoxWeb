import type { IconDefinition } from '@ant-design/icons-svg/lib/types'

// Usage: <Icon icon={ShopOutlined} /> with
// import ShopOutlined from '@ant-design/icons-svg/es/asn/ShopOutlined'
type Props = { icon: IconDefinition; className?: string }

export function Icon({ icon, className = 'size-4' }: Props) {
  const root = typeof icon.icon === 'function' ? icon.icon('currentColor', 'currentColor') : icon.icon
  return (
    <svg viewBox={root.attrs.viewBox} fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      {/* shortcut: only <path> children (all antd icons use paths), upgrade if an icon needs other tags */}
      {(root.children ?? []).map((c, i) => (
        <path key={i} d={String(c.attrs.d)} />
      ))}
    </svg>
  )
}
