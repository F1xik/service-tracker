import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { shiftDays, todayLocal } from '@/lib/date'
import type { AppointmentWithEntries } from './api'

const deleteMutate = vi.hoisted(() => vi.fn())
const fetchNextPage = vi.hoisted(() => vi.fn())

interface HistoryState {
  isLoading: boolean
  isError: boolean
  error: unknown
  hasNextPage: boolean
  isFetchingNextPage: boolean
  data: { pages: { rows: AppointmentWithEntries[]; count: number }[] } | undefined
}

const state = vi.hoisted(
  () =>
    ({
      history: {
        isLoading: false,
        isError: false,
        error: null,
        hasNextPage: false,
        isFetchingNextPage: false,
        data: { pages: [{ rows: [], count: 0 }] },
      } as HistoryState,
      dayCount: undefined as number | undefined,
    }) as { history: HistoryState; dayCount: number | undefined },
)

vi.mock('./useIncome', () => ({
  useInfiniteAppointments: () => ({ ...state.history, fetchNextPage }),
  useAppointmentDayCount: () => ({ data: state.dayCount }),
  useDeleteAppointment: () => ({ mutate: deleteMutate }),
}))

import { IncomeHistory } from './IncomeHistory'

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

function setPages(rows: AppointmentWithEntries[], count = rows.length) {
  state.history.data = { pages: [{ rows, count }] }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.history = {
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    data: { pages: [{ rows: [], count: 0 }] },
  }
  state.dayCount = undefined
})

describe('IncomeHistory', () => {
  it('defaults to the "Last 7 days" preset with the date inputs hidden', () => {
    render(<IncomeHistory currency="USD" />)

    expect(screen.getByRole('heading', { name: 'Income history' })).toBeInTheDocument()
    // The active preset is highlighted; the From/To inputs stay hidden.
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('To')).not.toBeInTheDocument()
  })

  it('reveals the date inputs, prefilled to the current window, on "Custom"', async () => {
    const user = userEvent.setup()
    render(<IncomeHistory currency="USD" />)

    await user.click(screen.getByRole('button', { name: 'Custom' }))

    const today = todayLocal()
    expect(screen.getByLabelText('From')).toHaveValue(shiftDays(today, -6))
    expect(screen.getByLabelText('To')).toHaveValue(today)
    expect(screen.getByRole('button', { name: 'Custom' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('switches the active preset when another quick filter is chosen', async () => {
    const user = userEvent.setup()
    render(<IncomeHistory currency="USD" />)

    await user.click(screen.getByRole('button', { name: 'All time' }))

    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    // Inputs remain hidden for a non-custom preset.
    expect(screen.queryByLabelText('From')).not.toBeInTheDocument()
  })

  it('renders an appointment with its service lines', () => {
    setPages([
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
    ])
    render(<IncomeHistory currency="USD" />)

    const list = screen.getAllByRole('list')[0]
    expect(within(list).getByText('Massage')).toBeInTheDocument()
    // The date appears once, as a group header that leads with the short weekday
    // (2026-06-02 is a Tuesday; the test locale renders it as "Tue, Jun 2, 2026").
    expect(within(list).getAllByText(/Tue, Jun 2, 2026/)).toHaveLength(1)
    // With no tip, the service take-home line and the day total both read $6.00
    // (no per-appointment total is shown).
    expect(within(list).getAllByText('$6.00')).toHaveLength(2)
  })

  it('groups appointments by date with one header and a daily total per day', () => {
    setPages([
      appointment({ id: 'a1', provided_on: '2026-06-02', tip: 4 }), // take-home 10
      appointment({ id: 'a2', provided_on: '2026-06-02', tip: 0 }), // take-home 6
      appointment({ id: 'a3', provided_on: '2026-06-01', tip: 0 }), // take-home 6
    ])
    render(<IncomeHistory currency="USD" />)

    const list = screen.getAllByRole('list')[0]
    // Two distinct dates → two headers. 2026-06-01 is a Monday.
    expect(within(list).getAllByText(/Tue, Jun 2, 2026/)).toHaveLength(1)
    expect(within(list).getAllByText(/Mon, Jun 1, 2026/)).toHaveLength(1)
    // The Jun 2 header totals the day's two appointments: 10 + 6 = $16.00.
    expect(within(list).getByText('$16.00')).toBeInTheDocument()
    // Three appointments → three delete buttons.
    expect(within(list).getAllByRole('button', { name: 'Delete entry' })).toHaveLength(
      3,
    )
  })

  it('keeps each day total complete across pages (no partial-day recalculation)', () => {
    // Pages are cut on whole-day boundaries, so a day never spans two pages:
    // page 1 holds all of Jun 2, page 2 all of Jun 1. Each day total is final
    // the moment its day is rendered.
    state.history.data = {
      pages: [
        {
          rows: [
            appointment({ id: 'a1', provided_on: '2026-06-02', tip: 4 }), // 10
            appointment({ id: 'a2', provided_on: '2026-06-02', tip: 0 }), // 6
          ],
          count: 3,
        },
        {
          rows: [appointment({ id: 'a3', provided_on: '2026-06-01', tip: 0 })], // 6
          count: 3,
        },
      ],
    }
    state.dayCount = 2
    render(<IncomeHistory currency="USD" />)

    const list = screen.getAllByRole('list')[0]
    // Jun 2 totals both of its appointments (10 + 6 = $16.00); Jun 1 reads $6.00.
    expect(within(list).getByText('$16.00')).toBeInTheDocument()
    expect(within(list).getAllByText(/Mon, Jun 1, 2026/)).toHaveLength(1)
    // Footer counts days (2 groups loaded), not appointments.
    expect(screen.getByText('Showing 2 of 2')).toBeInTheDocument()
  })

  it('shows the tip line and a take-home that includes it', () => {
    setPages([appointment({ tip: 4 })])
    render(<IncomeHistory currency="USD" />)

    const list = screen.getAllByRole('list')[0]
    expect(within(list).getByText('Tip')).toBeInTheDocument()
    expect(within(list).getByText('$4.00')).toBeInTheDocument()
    // 6 earned + 4 tip = 10, shown only as the (single-appointment) day total.
    expect(within(list).getByText('$10.00')).toBeInTheDocument()
  })

  it('keeps an appointment note hidden until its toggle is clicked', async () => {
    setPages([appointment({ note: 'Walk-in, paid cash' })])
    const user = userEvent.setup()
    render(<IncomeHistory currency="USD" />)

    // Collapsed by default: the note text is not in the document.
    expect(screen.queryByText('Walk-in, paid cash')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show note' }))
    expect(screen.getByText('Walk-in, paid cash')).toBeInTheDocument()

    // The toggle flips to "Hide note" and collapses the note again.
    await user.click(screen.getByRole('button', { name: 'Hide note' }))
    expect(screen.queryByText('Walk-in, paid cash')).not.toBeInTheDocument()
  })

  it('shows no note toggle for an appointment without a note', () => {
    setPages([appointment({ note: null })])
    render(<IncomeHistory currency="USD" />)

    expect(screen.queryByRole('button', { name: 'Show note' })).not.toBeInTheDocument()
  })

  it('deletes an appointment after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    setPages([appointment()])
    const user = userEvent.setup()
    render(<IncomeHistory currency="USD" />)

    await user.click(screen.getByRole('button', { name: 'Delete entry' }))
    expect(deleteMutate).toHaveBeenCalledWith('a1')
  })

  it('shows a "Load more" button when more pages exist and fetches the next one', async () => {
    setPages([appointment()], 5)
    state.history.hasNextPage = true
    state.dayCount = 5 // 5 days in the window, 1 loaded so far
    const user = userEvent.setup()
    render(<IncomeHistory currency="USD" />)

    expect(screen.getByText('Showing 1 of 5')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load more' }))
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('hides "Load more" once everything is loaded', () => {
    setPages([appointment()], 1)
    state.history.hasNextPage = false
    render(<IncomeHistory currency="USD" />)

    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('shows an empty-range message when the window has no income', () => {
    setPages([], 0)
    render(<IncomeHistory currency="USD" />)

    expect(screen.getByText('No income in this date range.')).toBeInTheDocument()
  })

  it('shows an error alert when the history fails to load', () => {
    state.history.isError = true
    state.history.error = new Error('Network down')
    state.history.data = undefined
    render(<IncomeHistory currency="USD" />)

    expect(screen.getByText('Network down')).toBeInTheDocument()
  })
})
