import { describe, expect, it } from 'vitest'

import { shiftDays, startOfMonth, toDateString, todayLocal } from './date'

describe('toDateString', () => {
  it('formats a local date with zero-padded month and day', () => {
    expect(toDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('todayLocal', () => {
  it('matches the local date components of now', () => {
    const now = new Date()
    expect(todayLocal()).toBe(toDateString(now))
  })
})

describe('shiftDays', () => {
  it('shifts forward and back within a month', () => {
    expect(shiftDays('2026-06-10', -6)).toBe('2026-06-04')
    expect(shiftDays('2026-06-10', 5)).toBe('2026-06-15')
  })

  it('rolls across a month boundary', () => {
    expect(shiftDays('2026-06-02', -6)).toBe('2026-05-27')
    expect(shiftDays('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('rolls across a year boundary', () => {
    expect(shiftDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDays('2025-12-31', 1)).toBe('2026-01-01')
  })

  it('handles leap-day arithmetic', () => {
    // 2024 is a leap year, so Feb has 29 days.
    expect(shiftDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(shiftDays('2024-03-01', -1)).toBe('2024-02-29')
    // 2026 is not, so Feb 28 rolls straight to Mar 1.
    expect(shiftDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('returns the same date when shifting by zero', () => {
    expect(shiftDays('2026-06-10', 0)).toBe('2026-06-10')
  })
})

describe('startOfMonth', () => {
  it('returns the first day of the containing month', () => {
    expect(startOfMonth('2026-06-17')).toBe('2026-06-01')
    expect(startOfMonth('2026-01-01')).toBe('2026-01-01')
    expect(startOfMonth('2026-12-31')).toBe('2026-12-01')
  })
})
