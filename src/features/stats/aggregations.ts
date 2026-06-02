/**
 * Pure aggregation helpers for the stats dashboard.
 *
 * This module must have zero React imports so it stays unit-testable in
 * isolation. It sums the immutable `amount_earned` snapshots — earnings are
 * never recomputed here.
 */

import type { IncomeEntryWithService } from '@/features/income/api'

export type Period = 'week' | 'month' | 'year'

export interface PeriodTotal {
  label: string
  total: number
}

export interface ServiceTotal {
  name: string
  total: number
}

export interface StatsSummary {
  allTime: number
  thisMonth: number
  entriesThisMonth: number
}

const MONTH_NAMES = [
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
]

/**
 * Parse a date-only `provided_on` string (YYYY-MM-DD) into a local Date.
 * Mirrors the parsing used elsewhere so days never shift across the UTC line.
 */
function parseProvidedOn(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** ISO 8601 week number and week-numbering year for a given date. */
function isoWeek(date: Date): { year: number; week: number } {
  // Copy and shift to the nearest Thursday (ISO weeks belong to the year of
  // their Thursday). Days are 1 (Mon) .. 7 (Sun) in ISO terms.
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // 0 = Monday
  d.setDate(d.getDate() - day + 3) // move to Thursday of this week
  const isoYear = d.getFullYear()
  const firstThursday = new Date(isoYear, 0, 4)
  const firstDay = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3)
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86400000))
  return { year: isoYear, week }
}

/** Sortable key + display label for one entry under the given period. */
function periodBucket(date: Date, period: Period): { key: string; label: string } {
  const year = date.getFullYear()
  if (period === 'year') {
    return { key: String(year), label: String(year) }
  }
  if (period === 'month') {
    const month = date.getMonth()
    return {
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: `${MONTH_NAMES[month]} ${year}`,
    }
  }
  // week
  const { year: isoYear, week } = isoWeek(date)
  return {
    key: `${isoYear}-W${String(week).padStart(2, '0')}`,
    label: `W${week} ${isoYear}`,
  }
}

/**
 * Sum `amount_earned` per period bucket, sorted chronologically ascending.
 * Returns `[]` for empty input.
 */
export function groupByPeriod(
  entries: IncomeEntryWithService[],
  period: Period,
): PeriodTotal[] {
  const buckets = new Map<string, PeriodTotal>()
  for (const entry of entries) {
    const { key, label } = periodBucket(parseProvidedOn(entry.provided_on), period)
    const existing = buckets.get(key)
    if (existing) {
      existing.total += entry.amount_earned
    } else {
      buckets.set(key, { label, total: entry.amount_earned })
    }
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, value]) => value)
}

/**
 * Sum `amount_earned` per service, sorted by total descending. Entries with no
 * service (e.g. a deleted one) are grouped under "Unknown service".
 * Returns `[]` for empty input.
 */
export function groupByService(entries: IncomeEntryWithService[]): ServiceTotal[] {
  const buckets = new Map<string, number>()
  for (const entry of entries) {
    const name = entry.service?.name ?? 'Unknown service'
    buckets.set(name, (buckets.get(name) ?? 0) + entry.amount_earned)
  }
  return [...buckets.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
}

/**
 * All-time and current-month totals plus the count of entries logged this
 * month. `now` is injectable so the month boundary is unit-testable.
 */
export function summarize(
  entries: IncomeEntryWithService[],
  now: Date = new Date(),
): StatsSummary {
  const curYear = now.getFullYear()
  const curMonth = now.getMonth()
  let allTime = 0
  let thisMonth = 0
  let entriesThisMonth = 0
  for (const entry of entries) {
    allTime += entry.amount_earned
    const date = parseProvidedOn(entry.provided_on)
    if (date.getFullYear() === curYear && date.getMonth() === curMonth) {
      thisMonth += entry.amount_earned
      entriesThisMonth += 1
    }
  }
  return { allTime, thisMonth, entriesThisMonth }
}
