import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signUp = vi.hoisted(() => vi.fn())
vi.mock('./useAuth', () => ({ useAuth: () => ({ signUp }) }))

import SignUpPage from './SignUpPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/sign-up']}>
      <Routes>
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/" element={<div>home</div>} />
        <Route
          path="/sign-in"
          element={<div data-testid="signin">{location.search}</div>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SignUpPage', () => {
  beforeEach(() => {
    signUp.mockReset()
  })

  it('validates email and password', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email/i), 'bad')
    await user.type(screen.getByLabelText(/^password/i), '123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(
      screen.getByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()
    expect(signUp).not.toHaveBeenCalled()
  })

  it('passes the optional display name through when provided', async () => {
    signUp.mockResolvedValue({ needsEmailConfirmation: false })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/display name/i), 'Andrei')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith('a@b.com', 'password123', 'Andrei'),
    )
  })

  it('navigates straight home when no email confirmation is needed', async () => {
    signUp.mockResolvedValue({ needsEmailConfirmation: false })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('home')).toBeInTheDocument()
    // No display name typed -> undefined is forwarded, not an empty string.
    expect(signUp).toHaveBeenCalledWith('a@b.com', 'password123', undefined)
  })

  it('redirects to sign-in with a confirmation notice when required', async () => {
    signUp.mockResolvedValue({ needsEmailConfirmation: true })
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByTestId('signin')).toBeInTheDocument()
  })

  it('shows an inline error when sign-up fails', async () => {
    signUp.mockRejectedValue(new Error('Email already registered'))
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Email already registered')).toBeInTheDocument()
  })
})
