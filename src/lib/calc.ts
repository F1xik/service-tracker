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

export interface IncomeEntry {
  id: string
  user_id: string
  service_id: string | null
  provided_on: string
  price_snapshot: number
  commission_pct_snapshot: number
  amount_earned: number
  customer: string | null
  note: string | null
  source: 'manual' | 'import'
  created_at: string
}

/**
 * Compute the amount earned for an income entry.
 *
 * Mirrors the data-model invariant: `amount_earned = price * (commissionPct / 100)`,
 * rounded to two decimal places. Call this explicitly on every income insert —
 * never rely on a database trigger or default.
 *
 * The `+ Number.EPSILON` nudge guards against float representation error at the
 * half-cent boundary (e.g. `1.005 * 100` is `100.49999…`, which would otherwise
 * round down to `1.00`).
 */
export function computeEarnings(price: number, commissionPct: number): number {
  return Math.round((price * (commissionPct / 100) + Number.EPSILON) * 100) / 100
}
