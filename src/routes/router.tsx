import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { ProtectedRoute } from './ProtectedRoute'
import { lazyWithReload } from './lazyWithReload'
import { AppLayout } from '@/components/layout/AppLayout'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { RouteFallback } from '@/components/ui/RouteFallback'

// Pages are code-split so each route's JS (and heavy deps like recharts on the
// stats page) loads only when that route is visited, keeping the initial bundle
// small. The shell (ProtectedRoute, AppLayout) stays eager — it renders first.
// lazyWithReload recovers from stale-chunk import failures after a deploy.
const LogIncomePage = lazyWithReload(() => import('@/features/income/LogIncomePage'))
const ServicesPage = lazyWithReload(() => import('@/features/services/ServicesPage'))
const StatsPage = lazyWithReload(() => import('@/features/stats/StatsPage'))
const SettingsPage = lazyWithReload(() => import('@/features/settings/SettingsPage'))
const SignInPage = lazyWithReload(() => import('@/features/auth/SignInPage'))
const SignUpPage = lazyWithReload(() => import('@/features/auth/SignUpPage'))

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>
}

export const router = createBrowserRouter([
  {
    // Pathless root route: a single errorElement catches errors from any
    // descendant — including a lazy() page chunk that fails to load — so the
    // user gets a recoverable fallback instead of React Router's default page.
    errorElement: <RouteErrorBoundary />,
    children: [
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
    ],
  },
])
