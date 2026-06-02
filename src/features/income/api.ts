import { supabase } from '@/lib/supabase'
import { computeEarnings, type IncomeEntry } from '@/lib/calc'

/** A single service line within a batch: the service plus its (editable) price. */
export interface EntryLineInput {
  service_id: string
  price: number
}

/**
 * One batch submission. Date, customer and note are shared across every line;
 * each line becomes its own `income_entries` row.
 */
export interface CreateEntriesInput {
  provided_on: string
  customer: string | null
  note: string | null
  commissionPct: number
  lines: EntryLineInput[]
}

/** Recent-list shape — `income_entries` joined to the service name. */
export interface IncomeEntryWithService extends IncomeEntry {
  service: { name: string } | null
}

/**
 * Insert a batch of income entries in a single statement.
 *
 * A single array insert is one atomic statement in PostgREST, so this is
 * all-or-nothing: if any row violates a constraint or the backstop trigger,
 * the whole insert is rejected and nothing is saved.
 *
 * `amount_earned` is computed explicitly with `computeEarnings` per row — the
 * DB trigger only validates this value, it never computes it.
 */
export async function createEntries(input: CreateEntriesInput): Promise<IncomeEntry[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('You must be signed in to log income.')

  const rows = input.lines.map((line) => ({
    user_id: user.id,
    service_id: line.service_id,
    provided_on: input.provided_on,
    price_snapshot: line.price,
    commission_pct_snapshot: input.commissionPct,
    amount_earned: computeEarnings(line.price, input.commissionPct),
    customer: input.customer,
    note: input.note,
  }))

  const { data, error } = await supabase.from('income_entries').insert(rows).select()
  if (error) throw error
  return data ?? []
}

/** Fetch the most recent entries with their service name, newest first. */
export async function getEntries(limit = 20): Promise<IncomeEntryWithService[]> {
  const { data, error } = await supabase
    .from('income_entries')
    .select('*, service:services(name)')
    .order('provided_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('income_entries').delete().eq('id', id)
  if (error) throw error
}
