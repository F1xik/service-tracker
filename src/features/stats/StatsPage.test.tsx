import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
// primitives so the page renders; we capture the bar chart's data to assert the
// period toggle re-feeds it.
const barChartData = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('recharts', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  )
  return {
    ResponsiveContainer: Passthrough,
    BarChart: ({ data, children }: { data: unknown; children?: React.ReactNode }) => {
      barChartData.current = data
      return <div data-testid="bar-chart">{children}</div>
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
    barChartData.current = null
    state.stats = { isLoading: false, isError: false, error: null, data: [] }
    state.profile = { data: { currency: 'PLN', commission_pct: 15 } }
  })

  it('shows an empty state when there are no entries', () => {
    render(<StatsPage />)
    expect(screen.getByText(/no income logged yet/i)).toBeInTheDocument()
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
  })

  it('renders the summary cards from the entries', () => {
    state.stats.data = [
      entry({ provided_on: '2026-06-01', amount_earned: 10 }),
      entry({ provided_on: '2026-06-10', amount_earned: 15 }),
    ]
    render(<StatsPage />)
    expect(screen.getByText('All-time')).toBeInTheDocument()
    // Two entries logged this month.
    expect(screen.getByText('Entries this month')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('re-feeds the bar chart when the period toggle changes', async () => {
    const user = userEvent.setup()
    state.stats.data = [
      entry({ provided_on: '2026-05-10', amount_earned: 5 }),
      entry({ provided_on: '2026-06-10', amount_earned: 10 }),
    ]
    render(<StatsPage />)

    // Defaults to Month: two month buckets.
    expect(barChartData.current).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Year' }))
    // Both entries fall in 2026 → one year bucket.
    expect(barChartData.current).toHaveLength(1)
  })
})
