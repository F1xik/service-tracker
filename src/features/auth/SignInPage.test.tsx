import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signIn = vi.hoisted(() => vi.fn())
vi.mock('./useAuth', () => ({ useAuth: () => ({ signIn }) }))

import SignInPage from './SignInPage'

function renderPage(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/sign-in', state }]}>
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/" element={<div>home</div>} />
        <Route path="/sign-up" element={<div>sign up</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SignInPage', () => {
  beforeEach(() => {
    signIn.mockReset()
    signIn.mockResolvedValue(undefined)
  })

  it('validates the email and password before submitting', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/^password/i), 'short')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
    expect(
      screen.getByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('signs in and navigates home on valid credentials', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('a@b.com', 'password123'))
    expect(await screen.findByText('home')).toBeInTheDocument()
  })

  it('shows an inline error when sign-in fails', async () => {
    signIn.mockRejectedValue(new Error('Invalid login credentials'))
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
    expect(screen.queryByText('home')).not.toBeInTheDocument()
  })

  it('renders a notice passed via navigation state', () => {
    renderPage({ notice: 'Check your email to confirm your account, then sign in.' })
    expect(
      screen.getByText('Check your email to confirm your account, then sign in.'),
    ).toBeInTheDocument()
  })
})
