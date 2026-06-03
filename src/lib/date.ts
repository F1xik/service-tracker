/**
 * Helpers for local date-only (`YYYY-MM-DD`) strings.
 *
 * The app stores `provided_on` as a date-only value and renders it in the
 * user's local timezone. These helpers build dates from local components to
 * sidestep the UTC off-by-one of `Date.prototype.toISOString()`. They are
 * React-free so they stay unit-testable in isolation.
 */

/** Format a `Date` as a local `YYYY-MM-DD` string. */
export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local `YYYY-MM-DD` for today. */
export function todayLocal(): string {
  return toDateString(new Date())
}

/**
 * Shift a `YYYY-MM-DD` string by `days` (negative shifts into the past).
 * Month and year boundaries (and leap days) are handled by `Date` normalising
 * the overflowing day-of-month.
 */
export function shiftDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return toDateString(new Date(y, (m ?? 1) - 1, (d ?? 1) + days))
}

/** First day of the month containing `dateStr`, as `YYYY-MM-DD`. */
export function startOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number)
  return toDateString(new Date(y, (m ?? 1) - 1, 1))
}
