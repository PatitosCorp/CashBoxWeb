type Props = { label: string; selected?: boolean; color?: string; onClick?: () => void }

// antd CheckableTag; `color` tints it when selected (category color).
export function Tag({ label, selected, color, onClick }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={selected && color ? { backgroundColor: color, borderColor: color } : undefined}
      className={[
        'h-7 shrink-0 rounded border px-3 transition-colors',
        selected ? 'border-primary bg-primary text-white' : 'border-border bg-white text-text hover:text-primary-hover',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
