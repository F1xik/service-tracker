// This is a route-configuration module, not a fast-refreshable component
// module: the lazy() page consts below trip the react-refresh heuristic even
// though they are never HMR-mounted directly.
/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteFallback } from '@/components/ui/RouteFallback'

// Pages are code-split so each route's JS (and heavy deps like recharts on the
// stats page) loads only when that route is visited, keeping the initial bundle
// small. The shell (ProtectedRoute, AppLayout) stays eager — it renders first.
const LogIncomePage = lazy(() => import('@/features/income/LogIncomePage'))
const ServicesPage = lazy(() => import('@/features/services/ServicesPage'))
const StatsPage = lazy(() => import('@/features/stats/StatsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const SignInPage = lazy(() => import('@/features/auth/SignInPage'))
const SignUpPage = lazy(() => import('@/features/auth/SignUpPage'))

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>
}

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: withSuspense(<LogIncomePage />) },
          { path: '/services', element: withSuspense(<ServicesPage />) },
          { path: '/stats', element: withSuspense(<StatsPage />) },
          { path: '/settings', element: withSuspense(<SettingsPage />) },
        ],
      },
    ],
  },
  { path: '/sign-in', element: withSuspense(<SignInPage />) },
  { path: '/sign-up', element: withSuspense(<SignUpPage />) },
])
