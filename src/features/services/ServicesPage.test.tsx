import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Service } from '@/lib/calc'

const createMutateAsync = vi.hoisted(() => vi.fn())
const updateMutate = vi.hoisted(() => vi.fn())
const updateMutateAsync = vi.hoisted(() => vi.fn())
const deleteMutate = vi.hoisted(() => vi.fn())
const updateProfileMutateAsync = vi.hoisted(() => vi.fn())

const state = vi.hoisted(() => ({
  services: {
    isLoading: false,
    isError: false,
    error: null as unknown,
    data: [] as Service[],
  },
  profile: { data: { currency: 'PLN', commission_pct: 15 } },
}))

vi.mock('./useServices', () => ({
  useServices: () => state.services,
  useProfile: () => state.profile,
  useCreateService: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateService: () => ({
    mutate: updateMutate,
    mutateAsync: updateMutateAsync,
    isPending: false,
  }),
  useDeleteService: () => ({ mutate: deleteMutate }),
  useUpdateProfile: () => ({
    mutateAsync: updateProfileMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  }),
}))

import ServicesPage from './ServicesPage'

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: 's1',
    user_id: 'u1',
    name: 'Haircut',
    price: 40,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('ServicesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createMutateAsync.mockResolvedValue(undefined)
    updateMutateAsync.mockResolvedValue(undefined)
    updateProfileMutateAsync.mockResolvedValue(undefined)
    state.services = {
      isLoading: false,
      isError: false,
      error: null,
      data: [service()],
    }
    state.profile = { data: { currency: 'PLN', commission_pct: 15 } }
  })

  it('renders the services from the query', () => {
    state.services.data = [
      service({ id: 's1', name: 'Haircut', price: 40 }),
      service({ id: 's2', name: 'Massage', price: 90, active: false }),
    ]
    render(<ServicesPage />)

    expect(screen.getByText('Haircut')).toBeInTheDocument()
    expect(screen.getByText('Massage')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('creates a service from the add dialog', async () => {
    const user = userEvent.setup()
    render(<ServicesPage />)

    await user.click(screen.getByRole('button', { name: 'Add' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/Name/), 'Beard trim')
    await user.type(within(dialog).getByLabelText(/Price/), '20')
    await user.click(within(dialog).getByRole('button', { name: 'Add' }))

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith({ name: 'Beard trim', price: 20 }),
    )
  })

  it('edits a service via the row menu', async () => {
    const user = userEvent.setup()
    render(<ServicesPage />)

    await user.click(screen.getByRole('button', { name: /More actions for Haircut/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(/Name/)).toHaveValue('Haircut')

    const priceInput = within(dialog).getByLabelText(/Price/)
    await user.clear(priceInput)
    await user.type(priceInput, '45')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 's1',
        patch: { name: 'Haircut', price: 45 },
      }),
    )
  })

  it('toggles a service active flag via the switch', async () => {
    const user = userEvent.setup()
    render(<ServicesPage />)

    await user.click(screen.getByRole('switch', { name: /Deactivate Haircut/ }))

    expect(updateMutate).toHaveBeenCalledWith({ id: 's1', patch: { active: false } })
  })

  it('deletes a service after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()
    render(<ServicesPage />)

    await user.click(screen.getByRole('button', { name: /More actions for Haircut/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))

    expect(deleteMutate).toHaveBeenCalledWith('s1')
  })

  it('saves the commission percentage', async () => {
    const user = userEvent.setup()
    render(<ServicesPage />)

    const commission = screen.getByLabelText(/Commission/)
    await user.clear(commission)
    await user.type(commission, '20')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateProfileMutateAsync).toHaveBeenCalledWith({ commission_pct: 20 }),
    )
  })

  it('shows an error alert when the services query fails', () => {
    state.services = {
      isLoading: false,
      isError: true,
      error: new Error('Network down'),
      data: [],
    }
    render(<ServicesPage />)

    expect(screen.getByText('Network down')).toBeInTheDocument()
  })
})
