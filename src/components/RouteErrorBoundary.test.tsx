import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RouteErrorBoundary } from './RouteErrorBoundary'

function renderWithError(thrown: unknown) {
  const router = createMemoryRouter([
    {
      path: '/',
      loader: () => {
        throw thrown
      },
      element: <div>page</div>,
      errorElement: <RouteErrorBoundary />,
    },
  ])
  return render(<RouterProvider router={router} />)
}

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders a recoverable fallback with the error message', async () => {
    renderWithError(new Error("'text/html' is not a valid JavaScript MIME type"))

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText("'text/html' is not a valid JavaScript MIME type"),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('formats a thrown route error response as status text', async () => {
    renderWithError(new Response('nope', { status: 404, statusText: 'Not Found' }))

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('404 Not Found')).toBeInTheDocument()
  })
})
