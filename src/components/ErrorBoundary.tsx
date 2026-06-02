import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Top-level error boundary so a render error shows a recoverable fallback
 * instead of an unmounted white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh items-center justify-center bg-[var(--color-bg)] px-4 py-12">
          <Card className="w-full max-w-sm text-center">
            <h1 className="text-lg font-semibold text-[var(--color-fg)]">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
              An unexpected error occurred. Reloading usually fixes it.
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

    return this.props.children
  }
}
