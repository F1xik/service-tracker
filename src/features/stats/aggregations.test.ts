import { describe, expect, it } from 'vitest'

import type {
  AppointmentWithEntries,
  IncomeEntryWithService,
} from '@/features/income/api'
import {
  customWindow,
  filterToRange,
  filterToWindow,
  groupByRange,
  groupByService,
  groupByWindow,
  pickGranularity,
  rangeBounds,
} from './aggregations'

// Reference "now": Monday 2026-06-15 (so the week window is Jun 15–21).
const now = new Date(2026, 5, 15)

let lineSeq = 0

/** A single service line item beneath an appointment. */
function line(overrides: Partial<IncomeEntryWithService> = {}): IncomeEntryWithService {
  return {
    id: `e${++lineSeq}`,
    user_id: 'u1',
    appointment_id: 'a1',
    service_id: 's1',
    price_snapshot: 100,
    commission_pct_snapshot: 10,
    amount_earned: 10,
    created_at: '2026-06-15T00:00:00Z',
    service: { name: 'Haircut' },
    ...overrides,
  }
}

/**
 * An appointment. By default it carries a single 10-earned line and no tip, so
 * its take-home is 10 — matching the old per-entry fixtures.
 */
function appt(overrides: Partial<AppointmentWithEntries> = {}): AppointmentWithEntries {
  const { entries, ...rest } = overrides
  return {
    id: 'a1',
    user_id: 'u1',
    provided_on: '2026-06-15',
    customer: null,
    note: null,
    tip: 0,
    source: 'manual',
    created_at: '2026-06-15T00:00:00Z',
    entries: entries ?? [line({ amount_earned: 10 })],
    ...rest,
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
  it('keeps only appointments inside the window', () => {
    const result = filterToRange(
      [
        appt({ provided_on: '2026-06-10', tip: 1 }), // before week
        appt({ provided_on: '2026-06-15', tip: 2 }), // Monday, in week
        appt({ provided_on: '2026-06-21', tip: 3 }), // Sunday, in week
        appt({ provided_on: '2026-06-22', tip: 4 }), // next Monday, out
      ],
      'week',
      now,
    )
    expect(result.map((a) => a.tip)).toEqual([2, 3])
  })
})

describe('groupByRange', () => {
  it('today returns a single bucket totalling take-home (earnings + tips)', () => {
    const result = groupByRange(
      [
        appt({
          provided_on: '2026-06-15',
          entries: [line({ amount_earned: 10 })],
          tip: 2,
        }),
        appt({ provided_on: '2026-06-15', entries: [line({ amount_earned: 5 })] }),
        appt({ provided_on: '2026-06-14', entries: [line({ amount_earned: 99 })] }), // excluded
      ],
      'today',
      now,
    )
    // 10 + 2 (tip) + 5 = 17, across 2 appointments.
    expect(result).toEqual([{ label: 'Today', total: 17, count: 2 }])
  })

  it('counts per appointment, not per line item (multi-service visit = 1 customer)', () => {
    const result = groupByRange(
      [
        appt({
          provided_on: '2026-06-15',
          entries: [
            line({ amount_earned: 10 }),
            line({ amount_earned: 20 }),
            line({ amount_earned: 5 }),
          ],
          tip: 3,
        }),
      ],
      'today',
      now,
    )
    // One visit → count 1; total = 10 + 20 + 5 + 3 tip = 38.
    expect(result).toEqual([{ label: 'Today', total: 38, count: 1 }])
  })

  it('week has 7 zero-filled daily buckets Mon..Sun with totals and counts', () => {
    const result = groupByRange(
      [
        appt({
          provided_on: '2026-06-15',
          entries: [line({ amount_earned: 10 })],
          tip: 4,
        }), // Mon
        appt({ provided_on: '2026-06-15', entries: [line({ amount_earned: 4 })] }), // Mon
        appt({ provided_on: '2026-06-17', entries: [line({ amount_earned: 7 })] }), // Wed
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
    // Mon: 10 + 4 tip + 4 = 18; Wed: 7.
    expect(result.map((b) => b.total)).toEqual([18, 0, 7, 0, 0, 0, 0])
    expect(result.map((b) => b.count)).toEqual([2, 0, 1, 0, 0, 0, 0])
  })

  it('month has one bucket per day with the day number as label', () => {
    const result = groupByRange(
      [appt({ provided_on: '2026-06-15', entries: [line({ amount_earned: 12 })] })],
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
        appt({ provided_on: '2026-01-05', entries: [line({ amount_earned: 3 })] }),
        appt({ provided_on: '2026-06-15', entries: [line({ amount_earned: 10 })] }),
        appt({ provided_on: '2025-12-31', entries: [line({ amount_earned: 99 })] }), // excluded
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

  it('sums per service across line items, descending by total', () => {
    const result = groupByService([
      appt({
        entries: [
          line({ service: { name: 'Haircut' }, amount_earned: 10 }),
          line({ service: { name: 'Color' }, amount_earned: 25 }),
        ],
      }),
      appt({ entries: [line({ service: { name: 'Haircut' }, amount_earned: 5 })] }),
    ])
    expect(result).toEqual([
      { name: 'Color', total: 25 },
      { name: 'Haircut', total: 15 },
    ])
  })

  it('groups null services under "Unknown service"', () => {
    const result = groupByService([
      appt({ entries: [line({ service: null, service_id: null, amount_earned: 8 })] }),
    ])
    expect(result).toEqual([{ name: 'Unknown service', total: 8 }])
  })

  it('accumulates tips into their own "Tips" slice', () => {
    const result = groupByService([
      appt({
        entries: [line({ service: { name: 'Haircut' }, amount_earned: 10 })],
        tip: 3,
      }),
      appt({
        entries: [line({ service: { name: 'Haircut' }, amount_earned: 10 })],
        tip: 2,
      }),
    ])
    expect(result).toEqual([
      { name: 'Haircut', total: 20 },
      { name: 'Tips', total: 5 },
    ])
  })

  it('omits the Tips slice when there are no tips', () => {
    const result = groupByService([
      appt({
        entries: [line({ service: { name: 'Haircut' }, amount_earned: 10 })],
        tip: 0,
      }),
    ])
    expect(result).toEqual([{ name: 'Haircut', total: 10 }])
  })
})

describe('pickGranularity', () => {
  const daysFromNewYear = (n: number) => new Date(2026, 0, 1 + n)

  it('uses day granularity for spans under 93 days', () => {
    expect(pickGranularity(new Date(2026, 0, 1), daysFromNewYear(92))).toBe('day')
  })

  it('switches to month granularity at 93 days', () => {
    expect(pickGranularity(new Date(2026, 0, 1), daysFromNewYear(93))).toBe('month')
  })

  it('uses month granularity up to 36 months', () => {
    expect(pickGranularity(new Date(2026, 0, 1), new Date(2029, 0, 1))).toBe('month')
  })

  it('switches to year granularity past 36 months', () => {
    expect(pickGranularity(new Date(2026, 0, 1), new Date(2029, 1, 1))).toBe('year')
  })
})

describe('customWindow', () => {
  it('resolves explicit from/to with an exclusive end', () => {
    const w = customWindow([], '2026-06-01', '2026-06-10', now)
    expect(w.start).toEqual(new Date(2026, 5, 1))
    expect(w.end).toEqual(new Date(2026, 5, 11))
    expect(w.granularity).toBe('day')
  })

  it('all time derives start from the earliest appointment and end from today', () => {
    const w = customWindow(
      [appt({ provided_on: '2026-01-10' }), appt({ provided_on: '2026-03-05' })],
      '',
      '',
      now,
    )
    expect(w.start).toEqual(new Date(2026, 0, 10))
    expect(w.end).toEqual(new Date(2026, 5, 16)) // today + 1 day
  })

  it('all time with no appointments yields a single day at today', () => {
    const w = customWindow([], '', '', now)
    expect(w.start).toEqual(new Date(2026, 5, 15))
    expect(w.end).toEqual(new Date(2026, 5, 16))
    expect(w.granularity).toBe('day')
  })

  it('supports a one-sided from bound', () => {
    const w = customWindow([], '2026-06-01', '', now)
    expect(w.start).toEqual(new Date(2026, 5, 1))
    expect(w.end).toEqual(new Date(2026, 5, 16))
  })

  it('supports a one-sided to bound', () => {
    const w = customWindow([appt({ provided_on: '2026-02-01' })], '', '2026-06-10', now)
    expect(w.start).toEqual(new Date(2026, 1, 1))
    expect(w.end).toEqual(new Date(2026, 5, 11))
  })
})

describe('filterToWindow', () => {
  it('includes the start day and excludes the exclusive end', () => {
    const w = customWindow([], '2026-06-01', '2026-06-10', now)
    const result = filterToWindow(
      [
        appt({ provided_on: '2026-06-01', tip: 1 }), // start — included
        appt({ provided_on: '2026-06-10', tip: 2 }), // inclusive 'to' — included
        appt({ provided_on: '2026-06-11', tip: 3 }), // == end — excluded
        appt({ provided_on: '2026-05-31', tip: 4 }), // before start — excluded
      ],
      w,
    )
    expect(result.map((a) => a.tip)).toEqual([1, 2])
  })
})

describe('groupByWindow', () => {
  it('day granularity across a month boundary uses M/D labels', () => {
    const w = customWindow([], '2026-05-30', '2026-06-02', now)
    const result = groupByWindow(
      [
        appt({
          provided_on: '2026-05-31',
          entries: [line({ amount_earned: 5 })],
          tip: 1,
        }),
        appt({ provided_on: '2026-06-01', entries: [line({ amount_earned: 7 })] }),
      ],
      w,
    )
    expect(result.map((b) => b.label)).toEqual(['5/30', '5/31', '6/1', '6/2'])
    expect(result.map((b) => b.total)).toEqual([0, 6, 7, 0])
    expect(result.map((b) => b.count)).toEqual([0, 1, 1, 0])
  })

  it("month granularity across a year boundary uses MON 'YY labels", () => {
    const w = customWindow([], '2025-11-01', '2026-02-28', now)
    const result = groupByWindow(
      [
        appt({ provided_on: '2025-12-15', entries: [line({ amount_earned: 10 })] }),
        appt({
          provided_on: '2026-01-20',
          entries: [line({ amount_earned: 4 })],
          tip: 2,
        }),
      ],
      w,
    )
    expect(result.map((b) => b.label)).toEqual([
      "Nov '25",
      "Dec '25",
      "Jan '26",
      "Feb '26",
    ])
    expect(result.map((b) => b.total)).toEqual([0, 10, 6, 0])
    expect(result.map((b) => b.count)).toEqual([0, 1, 1, 0])
  })

  it('year granularity over a multi-year span uses YYYY labels', () => {
    const w = customWindow([], '2022-01-01', '2026-06-15', now)
    const result = groupByWindow(
      [
        appt({ provided_on: '2023-05-01', entries: [line({ amount_earned: 9 })] }),
        appt({
          provided_on: '2025-07-01',
          entries: [line({ amount_earned: 3 })],
          tip: 1,
        }),
      ],
      w,
    )
    expect(result.map((b) => b.label)).toEqual(['2022', '2023', '2024', '2025', '2026'])
    expect(result.map((b) => b.total)).toEqual([0, 9, 0, 4, 0])
    expect(result.map((b) => b.count)).toEqual([0, 1, 0, 1, 0])
  })

  it('zero-fills buckets for an empty span', () => {
    const w = customWindow([], '2026-06-01', '2026-06-03', now)
    const result = groupByWindow([], w)
    expect(result).toHaveLength(3)
    expect(result.every((b) => b.total === 0 && b.count === 0)).toBe(true)
  })

  it('bucket totals and counts sum to the filtered earnings and count', () => {
    const appointments = [
      appt({
        provided_on: '2026-06-02',
        entries: [line({ amount_earned: 10 })],
        tip: 2,
      }),
      appt({
        provided_on: '2026-06-05',
        entries: [line({ amount_earned: 5 }), line({ amount_earned: 3 })],
      }),
      appt({ provided_on: '2026-07-01', entries: [line({ amount_earned: 9 })] }), // outside
    ]
    const w = customWindow([], '2026-06-01', '2026-06-30', now)
    const buckets = groupByWindow(appointments, w)
    const filtered = filterToWindow(appointments, w)
    const bucketTotal = buckets.reduce((s, b) => s + b.total, 0)
    const bucketCount = buckets.reduce((s, b) => s + b.count, 0)
    const filteredTotal = filtered.reduce(
      (s, a) => s + a.entries.reduce((x, e) => x + e.amount_earned, 0) + a.tip,
      0,
    )
    expect(bucketTotal).toBeCloseTo(filteredTotal, 2)
    expect(bucketCount).toBe(filtered.length)
  })
})
