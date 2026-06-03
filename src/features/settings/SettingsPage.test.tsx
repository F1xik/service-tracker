import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const updateProfileMutateAsync = vi.hoisted(() => vi.fn())

const state = vi.hoisted(() => ({
  profile: { data: { currency: 'PLN', commission_pct: 15 } },
  updateProfile: {
    mutateAsync: updateProfileMutateAsync,
    isPending: false,
    isError: false,
    error: null as unknown,
  },
}))

vi.mock('@/features/services/useServices', () => ({
  useProfile: () => state.profile,
  useUpdateProfile: () => state.updateProfile,
}))

import SettingsPage from './SettingsPage'

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateProfileMutateAsync.mockResolvedValue(undefined)
    state.profile = { data: { currency: 'PLN', commission_pct: 15 } }
    state.updateProfile = {
      mutateAsync: updateProfileMutateAsync,
      isPending: false,
      isError: false,
      error: null,
    }
  })

  it('renders the language picker and commission form with resolved copy', () => {
    render(<SettingsPage />)

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Language/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Commission/)).toHaveValue(15)
    expect(screen.getByText(/Applies to new entries only/)).toBeInTheDocument()
  })

  it('saves the commission percentage and shows the confirmation', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    const commission = screen.getByLabelText(/Commission/)
    await user.clear(commission)
    await user.type(commission, '20')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateProfileMutateAsync).toHaveBeenCalledWith({ commission_pct: 20 }),
    )
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('rejects a commission outside the 0–100 range', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    const commission = screen.getByLabelText(/Commission/)
    await user.clear(commission)
    await user.type(commission, '150')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Must be between 0 and 100')).toBeInTheDocument()
    expect(updateProfileMutateAsync).not.toHaveBeenCalled()
  })

  it('shows an error alert when the update fails', () => {
    state.updateProfile = {
      mutateAsync: updateProfileMutateAsync,
      isPending: false,
      isError: true,
      error: new Error('Save failed'),
    }
    render(<SettingsPage />)

    expect(screen.getByText('Save failed')).toBeInTheDocument()
  })
})
