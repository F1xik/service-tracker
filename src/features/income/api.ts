import { supabase } from '@/lib/supabase'
import { computeEarnings, type Appointment, type IncomeEntry } from '@/lib/calc'

/** A single service line within an appointment: the service plus its (editable) price. */
export interface EntryLineInput {
  service_id: string
  price: number
}

/**
 * One appointment submission. Date, customer, note and tip live on the
 * appointment; each line becomes its own `income_entries` row beneath it.
 */
export interface CreateAppointmentInput {
  provided_on: string
  customer: string | null
  note: string | null
  tip: number
  commissionPct: number
  lines: EntryLineInput[]
}

/** A line item joined to its service name, as shown in lists. */
export interface IncomeEntryWithService extends IncomeEntry {
  service: { name: string } | null
}

/** An appointment with its embedded service-line items. */
export interface AppointmentWithEntries extends Appointment {
  entries: IncomeEntryWithService[]
}

/**
 * Create an appointment and its line items in a single transaction via the
 * `create_appointment` RPC. The function is atomic and runs as the caller, so
 * RLS and the backstop trigger still apply: if any line violates a constraint
 * the whole appointment is rejected and nothing is saved.
 *
 * `amount_earned` is computed explicitly with `computeEarnings` per line — the
 * RPC only stores this value, it never computes it.
 */
export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const lines = input.lines.map((line) => ({
    service_id: line.service_id,
    price_snapshot: line.price,
    commission_pct_snapshot: input.commissionPct,
    amount_earned: computeEarnings(line.price, input.commissionPct),
  }))

  const { data, error } = await supabase.rpc('create_appointment', {
    p_provided_on: input.provided_on,
    p_customer: input.customer,
    p_note: input.note,
    p_tip: input.tip,
    p_lines: lines,
  })
  if (error) throw error
  return data as Appointment
}

const APPOINTMENT_SELECT = '*, entries:income_entries(*, service:services(name))'

/** One page of appointments plus the exact total for the requested window. */
export interface AppointmentsPage {
  rows: AppointmentWithEntries[]
  count: number
}

export interface GetAppointmentsPageParams {
  /** Inclusive lower bound on `provided_on` (YYYY-MM-DD); omit for no lower bound. */
  from?: string
  /** Inclusive upper bound on `provided_on` (YYYY-MM-DD); omit for no upper bound. */
  to?: string
  offset?: number
  limit?: number
}

/**
 * Fetch one page of appointments within an optional `provided_on` date window,
 * newest first, with their line items and an exact total count for the window.
 *
 * Filtering is on `provided_on` — the user-facing service date, which is
 * indexed — so it stays cheap as history grows. `offset`/`limit` drive the
 * "load more" pagination; `count` lets the caller know when to stop. RLS scopes
 * rows to the logged-in user, so no explicit `user_id` filter is required.
 */
export async function getAppointmentsPage({
  from,
  to,
  offset = 0,
  limit = 20,
}: GetAppointmentsPageParams = {}): Promise<AppointmentsPage> {
  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT, { count: 'exact' })
    .order('provided_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (from) query = query.gte('provided_on', from)
  if (to) query = query.lte('provided_on', to)

  const { data, error, count } = await query.range(offset, offset + limit - 1)
  if (error) throw error
  return { rows: (data as AppointmentWithEntries[] | null) ?? [], count: count ?? 0 }
}

/**
 * Fetch every appointment for the user with its line items, oldest first.
 *
 * Used by the stats dashboard, which needs the full history (not the capped
 * recent list). RLS scopes rows to the logged-in user, so no explicit
 * `user_id` filter is required.
 */
export async function getAllAppointments(): Promise<AppointmentWithEntries[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .order('provided_on', { ascending: true })
  if (error) throw error
  return (data as AppointmentWithEntries[] | null) ?? []
}

/** Delete an appointment; its line items cascade away with it. */
export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase.from('appointments').delete().eq('id', id)
  if (error) throw error
}
