import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'

export function ProtectedRoute() {
  const { session, initializing } = useAuth()

  if (initializing) return null

  if (!session) return <Navigate to="/sign-in" replace />

  return <Outlet />
}
