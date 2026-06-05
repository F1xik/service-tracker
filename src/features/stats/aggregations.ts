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

/**
 * Bucketing granularity for the generic, date-range-driven window path used by
 * the "All time" and "Period" filters. Chosen automatically from the span.
 */
export type Granularity = 'day' | 'month' | 'year'

/** A resolved time window plus the bar-chart bucketing it should use. */
export interface Window {
  start: Date // inclusive, local midnight
  end: Date // exclusive, local midnight
  granularity: Granularity
}

export interface RangeBucket {
  label: string
  total: number
  count: number
}

export interface ServiceTotal {
  name: string
  total: number
}

/** Default locale; keeps labels English when a caller doesn't pass one. */
const DEFAULT_LOCALE = 'en'

const capitalize = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s

// Build short date-part names from the active locale via Intl, so axis/tooltip
// labels follow the UI language. Names are capitalized and any trailing
// abbreviation period dropped for compact, consistent labels. The base English
// locale yields "Jan".."Dec" / "Mon".."Sun" / "Today", so callers that omit a
// locale keep the original English labels and the pure-function tests stay
// deterministic.
const shortName = (fmt: Intl.DateTimeFormat, date: Date): string =>
  capitalize(fmt.format(date).replace(/\.$/, ''))

/** Localized short month names, indexed Jan(0)..Dec(11). */
function monthNames(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short' })
  return Array.from({ length: 12 }, (_, m) => shortName(fmt, new Date(2021, m, 1)))
}

/** Localized Monday-first short weekday names, indexed Mon(0)..Sun(6). */
function weekdayNames(locale: string): string[] {
  // 2021-03-01 is a Monday, so offsets 0..6 walk Mon..Sun.
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  return Array.from({ length: 7 }, (_, i) => shortName(fmt, new Date(2021, 2, 1 + i)))
}

/** Localized word for "today" (e.g. "Today" / "Сегодня"). */
function todayName(locale: string): string {
  return capitalize(
    new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'day'),
  )
}

/** Sum of a single appointment's earned line items plus its tip. */
function appointmentTotal(appointment: AppointmentWithEntries): number {
  const earned = appointment.entries.reduce((sum, e) => sum + e.amount_earned, 0)
  return earned + appointment.tip
}

/** Sum of service earnings (amount_earned) across appointments — excludes tips. */
export function sumEarned(appointments: AppointmentWithEntries[]): number {
  return appointments.reduce(
    (sum, a) => sum + a.entries.reduce((s, e) => s + e.amount_earned, 0),
    0,
  )
}

/** Sum of tips across appointments. */
export function sumTips(appointments: AppointmentWithEntries[]): number {
  return appointments.reduce((sum, a) => sum + a.tip, 0)
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
  locale: string = DEFAULT_LOCALE,
): RangeBucket[] {
  const { start } = rangeBounds(range, now)
  const buckets: RangeBucket[] = []
  const indexOf = new Map<string, number>()

  const seed = (key: string, label: string) => {
    indexOf.set(key, buckets.length)
    buckets.push({ label, total: 0, count: 0 })
  }

  if (range === 'today') {
    seed(bucketKey(start, range), todayName(locale))
  } else if (range === 'week') {
    const names = weekdayNames(locale)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      seed(bucketKey(d, range), names[i])
    }
  } else if (range === 'month') {
    const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(start.getFullYear(), start.getMonth(), day)
      seed(bucketKey(d, range), String(day))
    }
  } else {
    const names = monthNames(locale)
    for (let m = 0; m < 12; m++) {
      const d = new Date(start.getFullYear(), m, 1)
      seed(bucketKey(d, range), names[m])
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
 * Generic, date-range-driven window path — backs the "All time" and "Period"
 * filters. Unlike the four fixed presets above, the window's bucketing is chosen
 * automatically from the span so an arbitrary range stays readable.
 */

const MS_PER_DAY = 86_400_000

/**
 * Choose a bar-chart granularity from a `[start, end)` span:
 *   span < ~93 days   -> 'day'
 *   span <= ~36 months -> 'month'
 *   otherwise          -> 'year'
 * This caps the bar count (≈92 day bars / ≈36 month bars) so a very wide range
 * never renders thousands of bars.
 */
export function pickGranularity(start: Date, end: Date): Granularity {
  const days = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
  if (days < 93) return 'day'
  const months =
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (months <= 36) return 'month'
  return 'year'
}

/**
 * Resolve a window from custom From/To date-only strings (`''` = unbounded).
 * "All time" passes both empty: the start falls back to the earliest
 * appointment (or today if there are none) and the end is today + 1 day.
 */
export function customWindow(
  appointments: AppointmentWithEntries[],
  from: string,
  to: string,
  now: Date = new Date(),
): Window {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let start: Date
  if (from) {
    start = parseProvidedOn(from)
  } else {
    let earliest: Date | null = null
    for (const appointment of appointments) {
      const date = parseProvidedOn(appointment.provided_on)
      if (!earliest || date < earliest) earliest = date
    }
    start = earliest ?? today
  }

  let end: Date
  if (to) {
    end = parseProvidedOn(to)
  } else {
    end = new Date(today)
  }
  end.setDate(end.getDate() + 1) // make the end exclusive

  // Guard against backwards or empty windows (e.g. earliest entry in the future).
  if (end <= start) {
    end = new Date(start)
    end.setDate(end.getDate() + 1)
  }

  return { start, end, granularity: pickGranularity(start, end) }
}

/** Appointments whose `provided_on` falls in the window `[start, end)`. */
export function filterToWindow(
  appointments: AppointmentWithEntries[],
  window: Window,
): AppointmentWithEntries[] {
  return appointments.filter((appointment) => {
    const date = parseProvidedOn(appointment.provided_on)
    return date >= window.start && date < window.end
  })
}

/** Stable bucket key for a date at the given granularity. */
function bucketKeyFor(date: Date, granularity: Granularity): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  if (granularity === 'year') return `${y}`
  if (granularity === 'month') return `${y}-${m}`
  return `${y}-${m}-${String(date.getDate()).padStart(2, '0')}`
}

/** The ordered list of bucket-start dates that tile a window. */
function bucketDates(window: Window): Date[] {
  const { start, end, granularity } = window
  const dates: Date[] = []
  const cursor =
    granularity === 'year'
      ? new Date(start.getFullYear(), 0, 1)
      : granularity === 'month'
        ? new Date(start.getFullYear(), start.getMonth(), 1)
        : new Date(start.getFullYear(), start.getMonth(), start.getDate())
  while (cursor < end) {
    dates.push(new Date(cursor))
    if (granularity === 'year') cursor.setFullYear(cursor.getFullYear() + 1)
    else if (granularity === 'month') cursor.setMonth(cursor.getMonth() + 1)
    else cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/**
 * Same shape as {@link groupByRange} but over an arbitrary {@link Window}.
 * Buckets are pre-seeded across the whole span so empty periods still render,
 * keeping the x-axis continuous. Labels adapt to the span so they stay distinct:
 *   day   -> day number, or `M/D` once the span crosses months
 *   month -> `MON`, or `MON 'YY` once the span crosses years
 *   year  -> `YYYY`
 */
export function groupByWindow(
  appointments: AppointmentWithEntries[],
  window: Window,
  locale: string = DEFAULT_LOCALE,
): RangeBucket[] {
  const { granularity } = window
  const dates = bucketDates(window)

  const first = dates[0]
  const last = dates[dates.length - 1]
  const crossesMonth =
    !!first &&
    !!last &&
    (first.getFullYear() !== last.getFullYear() || first.getMonth() !== last.getMonth())
  const crossesYear = !!first && !!last && first.getFullYear() !== last.getFullYear()

  const months = granularity === 'month' ? monthNames(locale) : []
  const label = (date: Date): string => {
    if (granularity === 'year') return `${date.getFullYear()}`
    if (granularity === 'month') {
      const name = months[date.getMonth()]
      return crossesYear ? `${name} '${String(date.getFullYear()).slice(-2)}` : name
    }
    return crossesMonth
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : String(date.getDate())
  }

  const buckets: RangeBucket[] = []
  const indexOf = new Map<string, number>()
  for (const date of dates) {
    indexOf.set(bucketKeyFor(date, granularity), buckets.length)
    buckets.push({ label: label(date), total: 0, count: 0 })
  }

  for (const appointment of filterToWindow(appointments, window)) {
    const key = bucketKeyFor(parseProvidedOn(appointment.provided_on), granularity)
    const index = indexOf.get(key)
    if (index === undefined) continue
    const bucket = buckets[index]
    bucket.total += appointmentTotal(appointment)
    bucket.count += 1
  }

  return buckets
}

/**
 * Sum `amount_earned` per service, sorted by total descending. Only real
 * services are included: tips and line items with no service (e.g. a deleted
 * one) are excluded from the breakdown. Returns `[]` for empty input.
 */
export function groupByService(appointments: AppointmentWithEntries[]): ServiceTotal[] {
  const buckets = new Map<string, number>()
  for (const appointment of appointments) {
    for (const entry of appointment.entries) {
      const name = entry.service?.name
      if (!name) continue
      buckets.set(name, (buckets.get(name) ?? 0) + entry.amount_earned)
    }
  }
  return [...buckets.entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
}
