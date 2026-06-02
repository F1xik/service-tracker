import { render, screen, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Hold references to the auth method mocks so each test can shape return values
// and assert delegation. Defined before vi.mock via hoisting-safe factory.
const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { auth },
}))

import { AuthProvider } from './AuthContext'
import { useAuth } from './useAuth'

let unsubscribe: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  unsubscribe = vi.fn()
  auth.getSession.mockResolvedValue({ data: { session: null } })
  auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe } },
  })
  auth.signInWithPassword.mockResolvedValue({ error: null })
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
  auth.signOut.mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('useAuth', () => {
  it('throws when used outside of an AuthProvider', () => {
    // Silence the expected React error log for the thrown render.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow(
      /useAuth must be used inside AuthProvider/,
    )
    spy.mockRestore()
  })
})

describe('AuthProvider', () => {
  it('starts in an initializing state and resolves to the restored session', async () => {
    const session = { user: { id: 'u1' } }
    auth.getSession.mockResolvedValue({ data: { session } })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.initializing).toBe(false))
    expect(result.current.session).toEqual(session)
    expect(auth.getSession).toHaveBeenCalledTimes(1)
    expect(auth.onAuthStateChange).toHaveBeenCalledTimes(1)
  })

  it('treats a failed session restore as signed-out instead of hanging', async () => {
    auth.getSession.mockRejectedValue(new Error('network'))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.initializing).toBe(false))
    expect(result.current.session).toBeNull()
  })

  it('updates the session when onAuthStateChange fires', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.initializing).toBe(false))

    const newSession = { user: { id: 'u2' } }
    const handler = auth.onAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: unknown,
    ) => void
    act(() => handler('SIGNED_IN', newSession))

    await waitFor(() => expect(result.current.session).toEqual(newSession))
  })

  it('unsubscribes from auth changes on unmount', async () => {
    const { result, unmount } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.initializing).toBe(false))

    unmount()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('delegates signIn to supabase and rethrows on error', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.initializing).toBe(false))

    await act(async () => {
      await result.current.signIn('a@b.com', 'password123')
    })
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'password123',
    })

    auth.signInWithPassword.mockResolvedValue({ error: new Error('bad creds') })
    await expect(result.current.signIn('a@b.com', 'wrong')).rejects.toThrow('bad creds')
  })

  it('reports needsEmailConfirmation when signUp returns no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.initializing).toBe(false))

    auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
    let res!: { needsEmailConfirmation: boolean }
    await act(async () => {
      res = await result.current.signUp('a@b.com', 'password123', 'Andrei')
    })

    expect(res.needsEmailConfirmation).toBe(true)
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        password: 'password123',
        options: expect.objectContaining({ data: { display_name: 'Andrei' } }),
      }),
    )
  })

  it('reports no email confirmation needed when signUp returns a session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.initializing).toBe(false))

    auth.signUp.mockResolvedValue({
      data: { session: { user: { id: 'u3' } } },
      error: null,
    })
    let res!: { needsEmailConfirmation: boolean }
    await act(async () => {
      res = await result.current.signUp('a@b.com', 'password123')
    })

    expect(res.needsEmailConfirmation).toBe(false)
    // Omitting the display name should leave options.data undefined.
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({ data: undefined }),
      }),
    )
  })

  it('rethrows when signUp errors', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.initializing).toBe(false))

    auth.signUp.mockResolvedValue({ data: {}, error: new Error('email taken') })
    await expect(result.current.signUp('a@b.com', 'password123')).rejects.toThrow(
      'email taken',
    )
  })

  it('delegates signOut and rethrows on error', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.initializing).toBe(false))

    await act(async () => {
      await result.current.signOut()
    })
    expect(auth.signOut).toHaveBeenCalledTimes(1)

    auth.signOut.mockResolvedValue({ error: new Error('offline') })
    await expect(result.current.signOut()).rejects.toThrow('offline')
  })

  it('provides the context to descendant components', async () => {
    function Probe() {
      const { initializing } = useAuth()
      return <span>{initializing ? 'loading' : 'ready'}</span>
    }
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument())
  })
})
