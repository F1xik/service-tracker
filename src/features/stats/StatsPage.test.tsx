import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { IncomeEntryWithService } from '@/features/income/api'

const state = vi.hoisted(() => ({
  stats: {
    isLoading: false,
    isError: false,
    error: null as unknown,
    data: [] as IncomeEntryWithService[],
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
  overrides: Partial<IncomeEntryWithService> = {},
): IncomeEntryWithService {
  return {
    id: 'e1',
    user_id: 'u1',
    service_id: 's1',
    provided_on: '2026-06-15',
    price_snapshot: 100,
    commission_pct_snapshot: 10,
    amount_earned: 10,
    customer: null,
    note: null,
    source: 'manual',
    created_at: '2026-06-15T00:00:00Z',
    service: { name: 'Haircut' },
    ...overrides,
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
