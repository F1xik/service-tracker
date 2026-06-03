import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Service } from '@/lib/calc'

const createMutateAsync = vi.hoisted(() => vi.fn())

const state = vi.hoisted(() => ({
  profile: {
    isLoading: false,
    isError: false,
    data: { currency: 'USD', commission_pct: 15 },
  },
  services: {
    isLoading: false,
    isError: false,
    data: [] as Service[],
  },
}))

vi.mock('@/features/services/useServices', () => ({
  useProfile: () => state.profile,
  useServices: () => state.services,
}))

vi.mock('./useIncome', () => ({
  useCreateAppointment: () => ({ mutateAsync: createMutateAsync, isPending: false }),
}))

// The history list has its own test; stub it so these tests focus on the form.
vi.mock('./IncomeHistory', () => ({
  IncomeHistory: () => <div data-testid="income-history" />,
}))

import LogIncomePage from './LogIncomePage'

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

function renderPage() {
  return render(
    <MemoryRouter>
      <LogIncomePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  createMutateAsync.mockResolvedValue(undefined)
  state.profile = {
    isLoading: false,
    isError: false,
    data: { currency: 'USD', commission_pct: 15 },
  }
  state.services = { isLoading: false, isError: false, data: [service()] }
})

describe('LogIncomePage', () => {
  it('shows a spinner while setup queries load', () => {
    state.services = { isLoading: true, isError: false, data: [] }
    renderPage()
    expect(screen.getByRole('status', { name: 'Loading form' })).toBeInTheDocument()
  })

  it('guides the user to add a service when none are active', () => {
    state.services = {
      isLoading: false,
      isError: false,
      data: [service({ active: false })],
    }
    renderPage()
    expect(screen.getByText(/no active services/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add a service first/ })).toHaveAttribute(
      'href',
      '/services',
    )
    expect(screen.queryByRole('button', { name: 'Log income' })).not.toBeInTheDocument()
  })

  it('renders the income history below the form', () => {
    renderPage()
    expect(screen.getByTestId('income-history')).toBeInTheDocument()
  })

  it('submits an appointment with a trimmed, assembled payload including tip', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText(/Service/), 's1')
    await user.clear(screen.getByLabelText(/Tip/))
    await user.type(screen.getByLabelText(/Tip/), '3')
    await user.click(screen.getByRole('button', { name: 'Log income' }))

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        commissionPct: 15,
        customer: null,
        note: null,
        tip: 3,
        lines: [{ service_id: 's1', price: 40 }],
      }),
    )
  })

  it('surfaces an error when the mutation fails', async () => {
    createMutateAsync.mockRejectedValue(new Error('Save failed'))
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText(/Service/), 's1')
    await user.click(screen.getByRole('button', { name: 'Log income' }))

    expect(await screen.findByText('Save failed')).toBeInTheDocument()
  })
})
