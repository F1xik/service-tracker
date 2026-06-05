import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

// Errors thrown while React Router resolves a route — most commonly a failed
// lazy() chunk import after a deploy — bubble here instead of to the top-level
// React ErrorBoundary, which sits outside RouterProvider. Without this the user
// sees React Router's bare default error page.
export function RouteErrorBoundary() {
  const error = useRouteError()

  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)] px-4 py-12">
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-lg font-semibold text-[var(--color-fg)]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          This page failed to load. Reloading usually fixes it.
        </p>
        <p className="mt-2 break-words text-xs text-[var(--color-fg-muted)]">
          {detail}
        </p>
        <div className="mt-4">
          <Button fullWidth onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </Card>
    </div>
  )
}
