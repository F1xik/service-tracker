import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ProtectedRoute } from './ProtectedRoute'

const useAuth = vi.hoisted(() => vi.fn())
vi.mock('@/features/auth/useAuth', () => ({ useAuth }))

function renderAt(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>protected home</div>} />
        </Route>
        <Route path="/sign-in" element={<div>sign in page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuth.mockReset()
  })

  it('shows a loading status while the session is initializing', () => {
    useAuth.mockReturnValue({ session: null, initializing: true })
    renderAt()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(screen.queryByText('protected home')).not.toBeInTheDocument()
  })

  it('redirects to /sign-in when there is no session', () => {
    useAuth.mockReturnValue({ session: null, initializing: false })
    renderAt()
    expect(screen.getByText('sign in page')).toBeInTheDocument()
    expect(screen.queryByText('protected home')).not.toBeInTheDocument()
  })

  it('renders the protected outlet when a session exists', () => {
    useAuth.mockReturnValue({ session: { user: { id: 'u1' } }, initializing: false })
    renderAt()
    expect(screen.getByText('protected home')).toBeInTheDocument()
  })
})
