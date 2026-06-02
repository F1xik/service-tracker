/**
 * Pure aggregation helpers for the stats dashboard.
 *
 * This module must have zero React imports so it stays unit-testable in
 * isolation. It sums the immutable `amount_earned` snapshots (plus the
 * per-appointment tip) — earnings are never recomputed here.
 *
 * The dashboard is windowed: a selected `Range` (today/week/month/year) defines
 * a time window plus the x-axis bucketing, and every chart shows only the
 * appointments inside that window.
 */

import type { AppointmentWithEntries } from '@/features/income/api'

export type Range = 'today' | 'week' | 'month' | 'year'

/** Pie-slice label for tips, kept distinct from any service name. */
export const TIPS_SLICE_NAME = 'Tips'

export interface RangeBucket {
  label: string
  total: number
  count: number
}

export interface ServiceTotal {
  name: string
  total: number
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

// Monday-first weekday labels, aligned with a Monday-start week window.
const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Sum of a single appointment's earned line items plus its tip. */
function appointmentTotal(appointment: AppointmentWithEntries): number {
  const earned = appointment.entries.reduce((sum, e) => sum + e.amount_earned, 0)
  return earned + appointment.tip
}

/**
 * Parse a date-only `provided_on` string (YYYY-MM-DD) into a local Date.
 * Mirrors the parsing used elsewhere so days never shift across the UTC line.
 */
function parseProvidedOn(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Midnight at the Monday that starts the week containing `date`. */
function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // 0 = Monday .. 6 = Sunday
  d.setDate(d.getDate() - day)
  return d
}

/**
 * Inclusive start / exclusive end (at day granularity) for the window the given
 * range covers, relative to `now`.
 */
export function rangeBounds(
  range: Range,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'today') {
    const end = new Date(today)
    end.setDate(end.getDate() + 1)
    return { start: today, end }
  }
  if (range === 'week') {
    const start = startOfWeek(today)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    return { start, end }
  }
  if (range === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { start, end }
  }
  // year
  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear() + 1, 0, 1)
  return { start, end }
}

/** Appointments whose `provided_on` falls in the range window `[start, end)`. */
export function filterToRange(
  appointments: AppointmentWithEntries[],
  range: Range,
  now: Date = new Date(),
): AppointmentWithEntries[] {
  const { start, end } = rangeBounds(range, now)
  return appointments.filter((appointment) => {
    const date = parseProvidedOn(appointment.provided_on)
    return date >= start && date < end
  })
}

/**
 * Sum take-home (earnings + tip) per bucket (total) and count appointments
 * (count) across the selected window. Counting per appointment — not per line
 * item — keeps the customer count correct for multi-service visits. Buckets are
 * pre-seeded so empty days/months still render, keeping the x-axis continuous.
 * Order is chronological.
 */
export function groupByRange(
  appointments: AppointmentWithEntries[],
  range: Range,
  now: Date = new Date(),
): RangeBucket[] {
  const { start } = rangeBounds(range, now)
  const buckets: RangeBucket[] = []
  const indexOf = new Map<string, number>()

  const seed = (key: string, label: string) => {
    indexOf.set(key, buckets.length)
    buckets.push({ label, total: 0, count: 0 })
  }

  if (range === 'today') {
    seed(bucketKey(start, range), 'Today')
  } else if (range === 'week') {
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      seed(bucketKey(d, range), WEEKDAY_NAMES[i])
    }
  } else if (range === 'month') {
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(start.getFullYear(), start.getMonth(), day)
      seed(bucketKey(d, range), String(day))
    }
  } else {
    for (let m = 0; m < 12; m++) {
      const d = new Date(start.getFullYear(), m, 1)
      seed(bucketKey(d, range), MONTH_NAMES[m])
    }
  }

  for (const appointment of filterToRange(appointments, range, now)) {
    const key = bucketKey(parseProvidedOn(appointment.provided_on), range)
    const index = indexOf.get(key)
    if (index === undefined) continue
    const bucket = buckets[index]
    bucket.total += appointmentTotal(appointment)
    bucket.count += 1
  }

  return buckets
}

/** Stable bucket key for a date under the given range's granularity. */
function bucketKey(date: Date, range: Range): string {
  if (range === 'year') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  // today / week / month all bucket by day
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

/**
 * Sum `amount_earned` per service, sorted by total descending. Line items with
 * no service (e.g. a deleted one) are grouped under "Unknown service". Tips are
 * accumulated into their own "Tips" slice so the pie total matches take-home.
 * Returns `[]` for empty input.
 */
export function groupByService(appointments: AppointmentWithEntries[]): ServiceTotal[] {
  const buckets = new Map<string, number>()
  let tips = 0
  for (const appointment of appointments) {
    tips += appointment.tip
    for (const entry of appointment.entries) {
      const name = entry.service?.name ?? 'Unknown service'
      buckets.set(name, (buckets.get(name) ?? 0) + entry.amount_earned)
    }
  }
  if (tips > 0) {
    buckets.set(TIPS_SLICE_NAME, (buckets.get(TIPS_SLICE_NAME) ?? 0) + tips)
  }
  return [...buckets.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
}
