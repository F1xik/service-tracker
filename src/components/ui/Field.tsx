import { TriangleAlert } from 'lucide-react'

interface FieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  helper?: string
  children: React.ReactNode
}

export function Field({ id, label, required, error, helper, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-[var(--color-fg)]">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-[var(--color-negative)]">
            {' *'}
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1 text-xs text-[var(--color-negative)]"
        >
          <TriangleAlert size={12} aria-hidden="true" />
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="text-xs text-[var(--color-fg-subtle)]">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
