import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppointmentWithEntries } from '@/features/income/api'
import { formatPrice } from '@/lib/format'

const state = vi.hoisted(() => ({
  stats: {
    isLoading: false,
    isError: false,
    error: null as unknown,
    data: [] as AppointmentWithEntries[],
  },
  profile: { data: { currency: 'PLN', commission_pct: 15 } },
}))

vi.mock('./useStats', () => ({ useStats: () => state.stats }))
vi.mock('@/features/services/useServices', () => ({ useProfile: () => state.profile }))

// Recharts relies on layout measurements jsdom can't provide. Stub the chart
// primitives so the page renders; we capture each bar chart's data (keyed by the
// Bar's dataKey) to assert the range filter re-feeds both charts.
const barData = vi.hoisted(() => ({ current: {} as Record<string, unknown[]> }))
vi.mock('recharts', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  )
  return {
    ResponsiveContainer: Passthrough,
    BarChart: ({ data, children }: { data: unknown[]; children?: React.ReactNode }) => {
      // The Bar child declares which dataKey this chart renders.
      const bars = Array.isArray(children) ? children.flat(Infinity) : [children]
      const bar = bars.find(
        (c) => c?.props?.dataKey === 'total' || c?.props?.dataKey === 'count',
      )
      if (bar?.props?.dataKey) barData.current[bar.props.dataKey] = data
      return (
        <div data-testid={`bar-chart-${bar?.props?.dataKey ?? 'unknown'}`}>
          {children}
        </div>
      )
    },
    Bar: Passthrough,
    XAxis: Passthrough,
    YAxis: Passthrough,
    Tooltip: Passthrough,
    PieChart: Passthrough,
    Pie: Passthrough,
    Cell: Passthrough,
    Legend: Passthrough,
  }
})

import StatsPage from './StatsPage'

function entry(
  overrides: Partial<AppointmentWithEntries> & { amount_earned?: number } = {},
): AppointmentWithEntries {
  const { amount_earned = 10, ...rest } = overrides
  return {
    id: 'a1',
    user_id: 'u1',
    provided_on: '2026-06-15',
    customer: null,
    note: null,
    tip: 0,
    source: 'manual',
    created_at: '2026-06-15T00:00:00Z',
    entries: [
      {
        id: 'e1',
        user_id: 'u1',
        appointment_id: 'a1',
        service_id: 's1',
        price_snapshot: 100,
        commission_pct_snapshot: 10,
        amount_earned,
        created_at: '2026-06-15T00:00:00Z',
        service: { name: 'Haircut' },
      },
    ],
    ...rest,
  }
}

describe('StatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Window math depends on "now": pin to Monday 2026-06-15. Fake only Date so
    // userEvent's real timers keep working.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 5, 15, 12))
    barData.current = {}
    state.stats = { isLoading: false, isError: false, error: null, data: [] }
    state.profile = { data: { currency: 'PLN', commission_pct: 15 } }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows an empty state when there are no entries', () => {
    render(<StatsPage />)
    expect(screen.getByText(/no income logged yet/i)).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart-total')).not.toBeInTheDocument()
  })

  it('renders both bar charts with windowed data', () => {
    state.stats.data = [
      entry({ provided_on: '2026-06-15', amount_earned: 10 }),
      entry({ provided_on: '2026-06-15', amount_earned: 15 }),
    ]
    render(<StatsPage />)
    // Defaults to Month → one bucket per day of June (30 buckets).
    expect(barData.current.total).toHaveLength(30)
    expect(barData.current.count).toHaveLength(30)
    // No summary cards anymore.
    expect(screen.queryByText('All-time')).not.toBeInTheDocument()
  })

  it('re-feeds both charts when the range changes', async () => {
    const user = userEvent.setup()
    state.stats.data = [entry({ provided_on: '2026-06-15', amount_earned: 10 })]
    render(<StatsPage />)

    // Month → 30 daily buckets.
    expect(barData.current.total).toHaveLength(30)

    await user.click(screen.getByRole('button', { name: 'Year' }))
    // Year → 12 monthly buckets.
    expect(barData.current.total).toHaveLength(12)
    expect(barData.current.count).toHaveLength(12)

    await user.click(screen.getByRole('button', { name: 'Week' }))
    // Week → 7 daily buckets.
    expect(barData.current.total).toHaveLength(7)
  })

  it('renders a legend row per service below the pie chart', () => {
    state.stats.data = [
      entry({ provided_on: '2026-06-15', amount_earned: 30, tip: 10 }),
    ]
    render(<StatsPage />)
    // Custom HTML legend (not behind the recharts mock): one row per slice,
    // formatted as "name · price · pct%". One service + a tips slice.
    expect(screen.getByText(/Haircut · .* · \d+%/)).toBeInTheDocument()
    // Tips accumulate into their own translated slice.
    expect(screen.getByText(/Tips · .* · \d+%/)).toBeInTheDocument()
  })

  it('splits take-home into earned, income-excl-tips and tips boxes', () => {
    state.stats.data = [
      entry({ provided_on: '2026-06-15', amount_earned: 30, tip: 10 }),
      entry({ provided_on: '2026-06-15', amount_earned: 20, tip: 5 }),
    ]
    render(<StatsPage />)
    // The label <p> and value <p> share the same Card <div> wrapper.
    const box = (label: RegExp) => screen.getByText(label).closest('div') as HTMLElement
    // toHaveTextContent collapses the currency's non-breaking space, so match it.
    const money = (n: number) => formatPrice(n, 'PLN').replace(/\u00a0/g, ' ')
    // earned (incl. tips) = 50 + 15; income excl. tips = 50; tips = 15.
    expect(box(/total earned/i)).toHaveTextContent(money(65))
    expect(box(/income \(excl\. tips\)/i)).toHaveTextContent(money(50))
    expect(box(/total tips/i)).toHaveTextContent(money(15))
  })

  it('shows a window message when no entries fall in the selected range', async () => {
    const user = userEvent.setup()
    // Entry exists, but in a prior month; default range is the current month.
    state.stats.data = [entry({ provided_on: '2026-01-10', amount_earned: 10 })]
    render(<StatsPage />)

    expect(screen.getByText(/no income in this period/i)).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart-total')).not.toBeInTheDocument()

    // Switching to Year brings the January entry into the window.
    await user.click(screen.getByRole('button', { name: 'Year' }))
    expect(screen.queryByText(/no income in this period/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('bar-chart-total')).toBeInTheDocument()
  })
})
