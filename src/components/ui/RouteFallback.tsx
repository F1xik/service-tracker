import { Spinner } from '@/components/ui/Spinner'

// Full-screen centered spinner shown while auth initializes or a lazily loaded
// route chunk is being fetched. Kept identical to the auth-loading visual so
// route code splitting introduces no UI change.
export function RouteFallback() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)] text-[var(--color-fg-muted)]"
    >
      <Spinner />
    </div>
  )
}
