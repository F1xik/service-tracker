import { createBrowserRouter } from 'react-router-dom'

import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import LogIncomePage from '@/features/income/LogIncomePage'
import ServicesPage from '@/features/services/ServicesPage'
import StatsPage from '@/features/stats/StatsPage'
import SignInPage from '@/features/auth/SignInPage'
import SignUpPage from '@/features/auth/SignUpPage'

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <LogIncomePage /> },
          { path: '/services', element: <ServicesPage /> },
          { path: '/stats', element: <StatsPage /> },
        ],
      },
    ],
  },
  { path: '/sign-in', element: <SignInPage /> },
  { path: '/sign-up', element: <SignUpPage /> },
])
