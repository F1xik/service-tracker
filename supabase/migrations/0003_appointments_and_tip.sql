-- Appointments + per-appointment tip
-- Normalizes the income model into a parent `appointments` table (one per
-- customer visit) with child `income_entries` line items. Appointment-level
-- data (date, customer, note, source) moves to the parent, and a new `tip`
-- column lives there too: a tip is paid on top of the service price and is
-- NOT subject to commission, so it is deliberately excluded from the
-- `amount_earned` snapshot formula.
--
-- Per the product decision, existing income data is disposable — only
-- `profiles` (and `services`) are preserved — so `income_entries` is cleared
-- rather than backfilled before the new NOT NULL appointment link is added.

-- ---------------------------------------------------------------------------
-- Parent table: appointments
-- ---------------------------------------------------------------------------

create table appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provided_on date not null default current_date,
  customer text,
  note text,
  tip numeric not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint appointments_tip_nonnegative check (tip >= 0),
  constraint appointments_source_enum check (source in ('manual', 'import'))
);

create index appointments_user_id_idx on appointments (user_id);
create index appointments_provided_on_idx on appointments (provided_on);

alter table appointments enable row level security;

create policy "Users manage their own appointments"
  on appointments
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Re-parent income_entries onto appointments
-- ---------------------------------------------------------------------------

-- Existing rows are disposable; clear them so the new NOT NULL FK is safe.
delete from income_entries;

alter table income_entries
  add column appointment_id uuid not null references appointments on delete cascade;

-- Appointment-level columns now live on the parent.
drop index income_entries_provided_on_idx;
alter table income_entries drop constraint income_entries_source_enum;
alter table income_entries
  drop column provided_on,
  drop column customer,
  drop column note,
  drop column source;

create index income_entries_appointment_id_idx on income_entries (appointment_id);

-- ---------------------------------------------------------------------------
-- Atomic insert: one appointment + its line items in a single transaction
-- ---------------------------------------------------------------------------

-- Runs as the caller (security invoker) so RLS and the income_entries
-- ownership/amount backstop trigger still apply. `amount_earned` is supplied
-- by the client (computed via src/lib/calc.ts) — this function never computes
-- it, honoring the snapshot invariant. The function body is one transaction,
-- so either the appointment and all its lines persist or nothing does.
create or replace function public.create_appointment(
  p_provided_on date,
  p_customer text,
  p_note text,
  p_tip numeric,
  p_lines jsonb
)
returns appointments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_appointment appointments;
  v_line jsonb;
begin
  insert into public.appointments (user_id, provided_on, customer, note, tip, source)
  values (auth.uid(), p_provided_on, p_customer, p_note, coalesce(p_tip, 0), 'manual')
  returning * into v_appointment;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    insert into public.income_entries (
      user_id,
      appointment_id,
      service_id,
      price_snapshot,
      commission_pct_snapshot,
      amount_earned
    )
    values (
      auth.uid(),
      v_appointment.id,
      (v_line ->> 'service_id')::uuid,
      (v_line ->> 'price_snapshot')::numeric,
      (v_line ->> 'commission_pct_snapshot')::numeric,
      (v_line ->> 'amount_earned')::numeric
    );
  end loop;

  return v_appointment;
end;
$$;
