import { supabase } from '@/lib/supabase'
import { computeEarnings, type Appointment, type IncomeEntry } from '@/lib/calc'
import { shiftDays } from '@/lib/date'

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

/**
 * Target batch size for "load more". We fetch this many rows plus one to detect
 * whether the window is exhausted; the page is then trimmed back to whole days
 * (see `getAppointmentsDayPage`), so the actual row count returned per page
 * varies but never splits a day across the page boundary.
 */
export const DAY_FETCH_SIZE = 20

/**
 * One page of appointments — always whole days — plus a cursor for the next
 * page.
 */
export interface AppointmentsDayPage {
  /** Appointments for complete days only (a day is never split across pages). */
  rows: AppointmentWithEntries[]
  /**
   * Upper `provided_on` bound (YYYY-MM-DD, inclusive) for the next page, or
   * `null` when the window is fully loaded.
   */
  nextCursor: string | null
}

export interface GetAppointmentsDayPageParams {
  /** Inclusive lower bound on `provided_on` (YYYY-MM-DD); omit for no lower bound. */
  from?: string
  /** Inclusive upper bound on `provided_on` (YYYY-MM-DD); omit for no upper bound. */
  to?: string
  /**
   * Inclusive upper bound for this page, set from the previous page's
   * `nextCursor`. Omit for the first page (defaults to `to`).
   */
  before?: string
}

/**
 * Fetch one page of appointments within an optional `provided_on` window,
 * newest first, paginated by **whole day** so a day's appointments are never
 * split across pages. This keeps each day's client-computed total correct on
 * first render — the total never jumps when "load more" pulls in the rest of a
 * partially-loaded day.
 *
 * We over-fetch `DAY_FETCH_SIZE + 1` rows and trim the oldest date in the batch,
 * which the row limit may have cut off, handing it to the next page via
 * `nextCursor`. Filtering is on the indexed `provided_on`, and RLS scopes rows
 * to the logged-in user, so no explicit `user_id` filter is required.
 */
export async function getAppointmentsDayPage({
  from,
  to,
  before,
}: GetAppointmentsDayPageParams = {}): Promise<AppointmentsDayPage> {
  const upper = before ?? to

  let query = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .order('provided_on', { ascending: false })
    .order('created_at', { ascending: false })

  if (from) query = query.gte('provided_on', from)
  if (upper) query = query.lte('provided_on', upper)

  const { data, error } = await query.limit(DAY_FETCH_SIZE + 1)
  if (error) throw error

  const rows = (data as AppointmentWithEntries[] | null) ?? []

  // Fewer rows than the over-fetch limit means we reached the start of the
  // window: every day in the batch is complete, so there is nothing more.
  if (rows.length <= DAY_FETCH_SIZE) {
    return { rows, nextCursor: null }
  }

  // The oldest date in the batch may have been cut off by the limit. Drop it and
  // let the next page re-fetch it in full.
  const lastDate = rows[rows.length - 1]!.provided_on
  const complete = rows.filter((row) => row.provided_on !== lastDate)

  if (complete.length > 0) {
    return { rows: complete, nextCursor: lastDate }
  }

  // Pathological case: a single day has more than `DAY_FETCH_SIZE` appointments,
  // so trimming left nothing. Fetch that whole day on its own so we still make
  // progress, and point the next page strictly before it.
  let dayQuery = supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('provided_on', lastDate)
    .order('created_at', { ascending: false })
  if (from) dayQuery = dayQuery.gte('provided_on', from)

  const { data: dayData, error: dayError } = await dayQuery
  if (dayError) throw dayError

  return {
    rows: (dayData as AppointmentWithEntries[] | null) ?? [],
    nextCursor: from && lastDate <= from ? null : shiftDays(lastDate, -1),
  }
}

/**
 * Count the distinct service days (`provided_on`) in a window, for the
 * "showing X of Y" footer. Pagination is by day, so the footer counts days, not
 * appointments. Selects only the date column (no joins); RLS scopes rows to the
 * logged-in user.
 */
export async function getAppointmentDayCount({
  from,
  to,
}: { from?: string; to?: string } = {}): Promise<number> {
  let query = supabase.from('appointments').select('provided_on')
  if (from) query = query.gte('provided_on', from)
  if (to) query = query.lte('provided_on', to)

  const { data, error } = await query
  if (error) throw error

  const days = new Set(
    (data as { provided_on: string }[] | null)?.map((r) => r.provided_on),
  )
  return days.size
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
