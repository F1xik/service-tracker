import { Info, TriangleAlert, CheckCircle2 } from 'lucide-react'

type AlertVariant = 'error' | 'warning' | 'info' | 'success'

const config: Record<
  AlertVariant,
  { icon: React.ReactNode; bg: string; text: string; border: string }
> = {
  error: {
    icon: <TriangleAlert size={16} aria-hidden="true" />,
    bg: 'bg-[var(--color-negative-subtle)]',
    text: 'text-[var(--color-negative)]',
    border: 'border-[var(--color-negative)]',
  },
  warning: {
    icon: <TriangleAlert size={16} aria-hidden="true" />,
    bg: 'bg-[var(--color-warning-subtle)]',
    text: 'text-[var(--color-warning)]',
    border: 'border-[var(--color-warning)]',
  },
  info: {
    icon: <Info size={16} aria-hidden="true" />,
    bg: 'bg-[var(--color-info-subtle)]',
    text: 'text-[var(--color-info)]',
    border: 'border-[var(--color-info)]',
  },
  success: {
    icon: <CheckCircle2 size={16} aria-hidden="true" />,
    bg: 'bg-[var(--color-positive-subtle)]',
    text: 'text-[var(--color-positive)]',
    border: 'border-[var(--color-positive)]',
  },
}

interface AlertProps {
  variant?: AlertVariant
  children: React.ReactNode
  className?: string
}

export function Alert({ variant = 'info', children, className = '' }: AlertProps) {
  const c = config[variant]
  return (
    <div
      role="alert"
      className={[
        'flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm',
        c.bg,
        c.text,
        c.border,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {c.icon}
      <span>{children}</span>
    </div>
  )
}
