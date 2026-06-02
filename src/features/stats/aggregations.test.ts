import { describe, expect, it } from 'vitest'

import type { IncomeEntryWithService } from '@/features/income/api'
import {
  filterToRange,
  groupByRange,
  groupByService,
  rangeBounds,
} from './aggregations'

// Reference "now": Monday 2026-06-15 (so the week window is Jun 15–21).
const now = new Date(2026, 5, 15)

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

describe('rangeBounds', () => {
  it('today is a single-day window', () => {
    const { start, end } = rangeBounds('today', now)
    expect(start).toEqual(new Date(2026, 5, 15))
    expect(end).toEqual(new Date(2026, 5, 16))
  })

  it('week starts on Monday and spans 7 days', () => {
    // 2026-06-17 is a Wednesday; its week starts Monday 2026-06-15.
    const { start, end } = rangeBounds('week', new Date(2026, 5, 17))
    expect(start).toEqual(new Date(2026, 5, 15))
    expect(end).toEqual(new Date(2026, 5, 22))
  })

  it('month spans the calendar month', () => {
    const { start, end } = rangeBounds('month', now)
    expect(start).toEqual(new Date(2026, 5, 1))
    expect(end).toEqual(new Date(2026, 6, 1))
  })

  it('year spans the calendar year', () => {
    const { start, end } = rangeBounds('year', now)
    expect(start).toEqual(new Date(2026, 0, 1))
    expect(end).toEqual(new Date(2027, 0, 1))
  })
})

describe('filterToRange', () => {
  it('keeps only entries inside the window', () => {
    const result = filterToRange(
      [
        entry({ provided_on: '2026-06-10', amount_earned: 1 }), // before week
        entry({ provided_on: '2026-06-15', amount_earned: 2 }), // Monday, in week
        entry({ provided_on: '2026-06-21', amount_earned: 3 }), // Sunday, in week
        entry({ provided_on: '2026-06-22', amount_earned: 4 }), // next Monday, out
      ],
      'week',
      now,
    )
    expect(result.map((e) => e.amount_earned)).toEqual([2, 3])
  })
})

describe('groupByRange', () => {
  it('today returns a single bucket', () => {
    const result = groupByRange(
      [
        entry({ provided_on: '2026-06-15', amount_earned: 10 }),
        entry({ provided_on: '2026-06-15', amount_earned: 5 }),
        entry({ provided_on: '2026-06-14', amount_earned: 99 }), // yesterday, excluded
      ],
      'today',
      now,
    )
    expect(result).toEqual([{ label: 'Today', total: 15, count: 2 }])
  })

  it('week has 7 zero-filled daily buckets Mon..Sun with totals and counts', () => {
    const result = groupByRange(
      [
        entry({ provided_on: '2026-06-15', amount_earned: 10 }), // Mon
        entry({ provided_on: '2026-06-15', amount_earned: 4 }), // Mon
        entry({ provided_on: '2026-06-17', amount_earned: 7 }), // Wed
      ],
      'week',
      now,
    )
    expect(result.map((b) => b.label)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ])
    expect(result.map((b) => b.total)).toEqual([14, 0, 7, 0, 0, 0, 0])
    expect(result.map((b) => b.count)).toEqual([2, 0, 1, 0, 0, 0, 0])
  })

  it('month has one bucket per day with the day number as label', () => {
    const result = groupByRange(
      [entry({ provided_on: '2026-06-15', amount_earned: 12 })],
      'month',
      now,
    )
    expect(result).toHaveLength(30) // June
    expect(result[0].label).toBe('1')
    expect(result[29].label).toBe('30')
    expect(result[14]).toEqual({ label: '15', total: 12, count: 1 })
  })

  it('year has 12 monthly buckets Jan..Dec', () => {
    const result = groupByRange(
      [
        entry({ provided_on: '2026-01-05', amount_earned: 3 }),
        entry({ provided_on: '2026-06-15', amount_earned: 10 }),
        entry({ provided_on: '2025-12-31', amount_earned: 99 }), // last year, excluded
      ],
      'year',
      now,
    )
    expect(result).toHaveLength(12)
    expect(result.map((b) => b.label)).toEqual([
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ])
    expect(result[0]).toEqual({ label: 'Jan', total: 3, count: 1 })
    expect(result[5]).toEqual({ label: 'Jun', total: 10, count: 1 })
  })

  it('returns zero-filled buckets for empty input', () => {
    const result = groupByRange([], 'week', now)
    expect(result).toHaveLength(7)
    expect(result.every((b) => b.total === 0 && b.count === 0)).toBe(true)
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
