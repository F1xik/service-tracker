import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'

import { AuthProvider } from '@/features/auth/AuthContext'
import { ThemeProvider } from '@/features/settings/ThemeContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { router } from '@/routes/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sensible app-wide defaults so per-hook config stays consistent.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <RouterProvider router={router} />
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
