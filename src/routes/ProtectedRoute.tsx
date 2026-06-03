import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { RouteFallback } from '@/components/ui/RouteFallback'

export function ProtectedRoute() {
  const { session, initializing } = useAuth()

  if (initializing) {
    return <RouteFallback />
  }

  if (!session) return <Navigate to="/sign-in" replace />

  return <Outlet />
}
