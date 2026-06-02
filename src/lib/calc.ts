/**
 * Pure domain calculations and shared types.
 *
 * This module must have zero React imports so it stays unit-testable in
 * isolation and Capacitor-compatible.
 */

export interface Service {
  id: string
  user_id: string
  name: string
  price: number
  active: boolean
  created_at: string
}

/**
 * A customer visit: the parent of one or more `income_entries` line items.
 * Appointment-level data (date, customer, note, tip) lives here, not on the
 * individual service lines.
 */
export interface Appointment {
  id: string
  user_id: string
  provided_on: string
  customer: string | null
  note: string | null
  /** Paid on top of the service price; NOT subject to commission. */
  tip: number
  source: 'manual' | 'import'
  created_at: string
}

export interface IncomeEntry {
  id: string
  user_id: string
  appointment_id: string
  service_id: string | null
  price_snapshot: number
  commission_pct_snapshot: number
  amount_earned: number
  created_at: string
}

/**
 * Compute the amount earned for an income entry.
 *
 * Mirrors the data-model invariant: `amount_earned = price * (commissionPct / 100)`,
 * rounded to two decimal places. Call this explicitly on every income insert —
 * never rely on a database trigger or default.
 *
 * Floats can land just below a half-cent boundary (e.g. `100.5 * 1 / 100 * 100`
 * is `100.49999…`, which would otherwise round down). We correct with an epsilon
 * scaled to the value's magnitude — a fixed `Number.EPSILON` only works near 1.0
 * and is too small to fix the boundary for large amounts.
 */
export function computeEarnings(price: number, commissionPct: number): number {
  const scaled = price * (commissionPct / 100) * 100
  const corrected = scaled + Math.sign(scaled) * Number.EPSILON * Math.abs(scaled) * 4
  return Math.round(corrected) / 100
}

/**
 * Take-home for an appointment: commission-based earnings plus the tip.
 *
 * The tip is kept in full by the freelancer (no commission applies), so it is
 * added on top of `amount_earned` rather than folded into `computeEarnings`.
 * Rounds to two decimals to keep currency math exact when summing.
 */
export function computeTakeHome(earnings: number, tip: number): number {
  return Math.round((earnings + tip) * 100) / 100
}
