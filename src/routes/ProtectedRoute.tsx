import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { Spinner } from '@/components/ui/Spinner'

export function ProtectedRoute() {
  const { session, initializing } = useAuth()

  if (initializing) {
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

  if (!session) return <Navigate to="/sign-in" replace />

  return <Outlet />
}
