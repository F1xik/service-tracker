import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={error || undefined}
        className={[
          'h-11 w-full rounded-[var(--radius-md)] border px-3 text-base text-[var(--color-fg)]',
          'bg-[var(--color-surface)] placeholder:text-[var(--color-fg-subtle)]',
          'outline-none transition-colors duration-[var(--duration-fast)]',
          'focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-0',
          error
            ? 'border-[var(--color-negative)]'
            : 'border-[var(--color-border-strong)] hover:border-[var(--color-fg-muted)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
