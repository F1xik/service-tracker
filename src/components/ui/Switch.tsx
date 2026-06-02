interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className = '',
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
        'outline-none transition-colors duration-[var(--duration-fast)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-[var(--color-positive)]' : 'bg-[var(--color-border-strong)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'inline-block h-5 w-5 rounded-full bg-white shadow-[var(--shadow-xs)]',
          'transition-transform duration-[var(--duration-fast)]',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}
