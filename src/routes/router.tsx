import { createBrowserRouter } from 'react-router-dom'

import { ProtectedRoute } from './ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import HomePage from './HomePage'
import ServicesPage from '@/features/services/ServicesPage'
import SignInPage from '@/features/auth/SignInPage'
import SignUpPage from '@/features/auth/SignUpPage'

export const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/services', element: <ServicesPage /> },
        ],
      },
    ],
  },
  { path: '/sign-in', element: <SignInPage /> },
  { path: '/sign-up', element: <SignUpPage /> },
])
