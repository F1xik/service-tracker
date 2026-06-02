import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Service } from '@/lib/calc'

import type { AppointmentWithEntries } from './api'

const createMutateAsync = vi.hoisted(() => vi.fn())
const deleteMutate = vi.hoisted(() => vi.fn())

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
  appointments: {
    isLoading: false,
    isError: false,
    error: null as unknown,
    data: [] as AppointmentWithEntries[],
  },
}))

vi.mock('@/features/services/useServices', () => ({
  useProfile: () => state.profile,
  useServices: () => state.services,
}))

vi.mock('./useIncome', () => ({
  useAppointments: () => state.appointments,
  useCreateAppointment: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useDeleteAppointment: () => ({ mutate: deleteMutate }),
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

function appointment(
  overrides: Partial<AppointmentWithEntries> = {},
): AppointmentWithEntries {
  return {
    id: 'a1',
    user_id: 'u1',
    provided_on: '2026-06-02',
    customer: null,
    note: null,
    tip: 0,
    source: 'manual',
    created_at: '2026-06-02T00:00:00Z',
    entries: [
      {
        id: 'e1',
        user_id: 'u1',
        appointment_id: 'a1',
        service_id: 's1',
        price_snapshot: 40,
        commission_pct_snapshot: 15,
        amount_earned: 6,
        created_at: '2026-06-02T00:00:00Z',
        service: { name: 'Haircut' },
      },
    ],
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
  state.appointments = { isLoading: false, isError: false, error: null, data: [] }
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

  it('renders a recent appointment with its service lines', () => {
    state.appointments.data = [
      appointment({
        entries: [
          {
            id: 'e1',
            user_id: 'u1',
            appointment_id: 'a1',
            service_id: 's1',
            price_snapshot: 50,
            commission_pct_snapshot: 15,
            amount_earned: 6,
            created_at: '2026-06-02T00:00:00Z',
            service: { name: 'Massage' },
          },
        ],
      }),
    ]
    renderPage()
    // Outer list is the recent-appointments list (each row nests its own list).
    const list = screen.getAllByRole('list')[0]
    expect(within(list).getByText('Massage')).toBeInTheDocument()
    // With no tip, the line amount and the take-home total both read $6.00.
    expect(within(list).getAllByText('$6.00')).toHaveLength(2)
  })

  it('shows the tip line and a take-home that includes it', () => {
    state.appointments.data = [appointment({ tip: 4 })]
    renderPage()
    const list = screen.getAllByRole('list')[0]
    // The tip is itemized…
    expect(within(list).getByText('Tip')).toBeInTheDocument()
    expect(within(list).getByText('$4.00')).toBeInTheDocument()
    // …and folded into take-home: 6 earned + 4 tip = 10.
    expect(within(list).getByText('$10.00')).toBeInTheDocument()
  })

  it('deletes an appointment after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    state.appointments.data = [appointment()]
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Delete entry' }))
    expect(deleteMutate).toHaveBeenCalledWith('a1')
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

  it('shows an error alert when appointments fail to load', () => {
    state.appointments = {
      isLoading: false,
      isError: true,
      error: new Error('Network down'),
      data: [],
    }
    renderPage()
    expect(screen.getByText('Network down')).toBeInTheDocument()
  })
})
