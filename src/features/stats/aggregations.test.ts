import { describe, expect, it } from 'vitest'

import type {
  AppointmentWithEntries,
  IncomeEntryWithService,
} from '@/features/income/api'
import {
  filterToRange,
  groupByRange,
  groupByService,
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
