import { describe, expect, it } from 'vitest'

import type { IncomeEntryWithService } from '@/features/income/api'
import { groupByPeriod, groupByService, summarize } from './aggregations'

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

describe('groupByPeriod', () => {
  it('returns [] for empty input', () => {
    expect(groupByPeriod([], 'month')).toEqual([])
  })

  it('sums amount_earned per month, ascending', () => {
    const result = groupByPeriod(
      [
        entry({ provided_on: '2026-05-01', amount_earned: 5 }),
        entry({ provided_on: '2026-06-10', amount_earned: 10 }),
        entry({ provided_on: '2026-06-20', amount_earned: 7 }),
      ],
      'month',
    )
    expect(result).toEqual([
      { label: 'May 2026', total: 5 },
      { label: 'Jun 2026', total: 17 },
    ])
  })

  it('sums per year', () => {
    const result = groupByPeriod(
      [
        entry({ provided_on: '2025-12-31', amount_earned: 4 }),
        entry({ provided_on: '2026-01-01', amount_earned: 6 }),
      ],
      'year',
    )
    expect(result).toEqual([
      { label: '2025', total: 4 },
      { label: '2026', total: 6 },
    ])
  })

  it('orders week buckets chronologically across a year boundary', () => {
    // Dec 30 2025 and Jan 2 2026 both fall in ISO week 2026-W01; Jan 5 2026 is
    // ISO week 2026-W02. A naive label sort ("W1" vs "W2" vs "W52") would break;
    // the sortable key keeps them ordered.
    const result = groupByPeriod(
      [
        entry({ provided_on: '2025-12-22', amount_earned: 1 }), // 2025-W52
        entry({ provided_on: '2026-01-05', amount_earned: 3 }), // 2026-W02
        entry({ provided_on: '2025-12-30', amount_earned: 2 }), // 2026-W01
      ],
      'week',
    )
    expect(result.map((r) => r.label)).toEqual(['W52 2025', 'W1 2026', 'W2 2026'])
    expect(result.map((r) => r.total)).toEqual([1, 2, 3])
  })
})

describe('groupByService', () => {
  it('returns [] for empty input', () => {
    expect(groupByService([])).toEqual([])
  })

  it('sums per service, descending by total', () => {
    const result = groupByService([
      entry({ service: { name: 'Haircut' }, amount_earned: 10 }),
      entry({ service: { name: 'Color' }, amount_earned: 25 }),
      entry({ service: { name: 'Haircut' }, amount_earned: 5 }),
    ])
    expect(result).toEqual([
      { name: 'Color', total: 25 },
      { name: 'Haircut', total: 15 },
    ])
  })

  it('groups null services under "Unknown service"', () => {
    const result = groupByService([
      entry({ service: null, service_id: null, amount_earned: 8 }),
    ])
    expect(result).toEqual([{ name: 'Unknown service', total: 8 }])
  })
})

describe('summarize', () => {
  const now = new Date(2026, 5, 15) // 2026-06-15

  it('returns zeros for empty input', () => {
    expect(summarize([], now)).toEqual({
      allTime: 0,
      thisMonth: 0,
      entriesThisMonth: 0,
    })
  })

  it('separates this-month totals from earlier months', () => {
    const result = summarize(
      [
        entry({ provided_on: '2026-06-01', amount_earned: 10 }),
        entry({ provided_on: '2026-06-20', amount_earned: 15 }),
        entry({ provided_on: '2026-05-30', amount_earned: 100 }),
      ],
      now,
    )
    expect(result).toEqual({ allTime: 125, thisMonth: 25, entriesThisMonth: 2 })
  })
})
