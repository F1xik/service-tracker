/**
 * Group income appointments by their service date for the history list.
 *
 * React-free so it stays unit-testable in isolation. The input is expected to
 * be pre-sorted by `provided_on` DESC (as `getAppointmentsPage` returns it), so
 * groups come out newest-day-first; we still key by date and preserve first-seen
 * order to stay correct regardless of ordering.
 */
import { computeTakeHome } from '@/lib/calc'

import type { AppointmentWithEntries } from './api'

export interface AppointmentGroup {
  /** The shared `provided_on` date (YYYY-MM-DD) for every appointment in the group. */
  date: string
  appointments: AppointmentWithEntries[]
  /** Sum of take-home (commission earnings + tip) across the day's appointments. */
  total: number
}

/** Take-home for a single appointment: summed line earnings plus the tip. */
export function appointmentTakeHome(appointment: AppointmentWithEntries): number {
  const earned = appointment.entries.reduce((sum, e) => sum + e.amount_earned, 0)
  return computeTakeHome(earned, appointment.tip)
}

export function groupAppointmentsByDate(
  appointments: AppointmentWithEntries[],
): AppointmentGroup[] {
  const groups: AppointmentGroup[] = []
  const byDate = new Map<string, AppointmentGroup>()

  for (const appointment of appointments) {
    let group = byDate.get(appointment.provided_on)
    if (!group) {
      group = { date: appointment.provided_on, appointments: [], total: 0 }
      byDate.set(appointment.provided_on, group)
      groups.push(group)
    }
    group.appointments.push(appointment)
    // Sum per-appointment take-home, then round to keep currency math exact.
    group.total =
      Math.round((group.total + appointmentTakeHome(appointment)) * 100) / 100
  }

  return groups
}
