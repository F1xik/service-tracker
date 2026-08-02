-- Service Income Tracker — consolidated schema (final state)
-- Single migration that creates the full schema from scratch: tables, RLS
-- policies, integrity constraints, grants, and the RPC functions the app
-- calls. Run this once against a fresh Supabase project.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  commission_pct numeric not null default 0,
  currency text not null default 'PLN',
  created_at timestamptz not null default now(),
  constraint profiles_commission_pct_range
    check (commission_pct >= 0 and commission_pct <= 100)
);

create table services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  price numeric not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint services_price_nonnegative check (price >= 0)
);

-- One appointment per customer visit. Appointment-level data (date, customer,
-- note, tip, source) lives here; income line items live on income_entries.
-- A tip is paid on top of the service price and is NOT subject to
-- commission, so it is deliberately excluded from the amount_earned formula.
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

-- Line items for an appointment. price_snapshot, commission_pct_snapshot,
-- and amount_earned are captured once at insert time (via computeEarnings()
-- in src/lib/calc.ts) and are NEVER recalculated afterward, even if the
-- underlying service price or profile commission_pct changes later.
create table income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  appointment_id uuid not null references appointments on delete cascade,
  service_id uuid references services on delete set null,
  price_snapshot numeric not null,
  commission_pct_snapshot numeric not null,
  amount_earned numeric not null,
  created_at timestamptz not null default now(),
  constraint income_entries_price_snapshot_nonnegative check (price_snapshot >= 0),
  constraint income_entries_commission_pct_range
    check (commission_pct_snapshot >= 0 and commission_pct_snapshot <= 100),
  constraint income_entries_amount_earned_nonnegative check (amount_earned >= 0)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index services_user_id_idx on services (user_id);
create index appointments_user_id_idx on appointments (user_id);
create index appointments_provided_on_idx on appointments (provided_on);
create index income_entries_user_id_idx on income_entries (user_id);
create index income_entries_service_id_idx on income_entries (service_id);
create index income_entries_appointment_id_idx on income_entries (appointment_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;
alter table income_entries enable row level security;

create policy "Users manage their own profile"
  on profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Users manage their own services"
  on services
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their own appointments"
  on appointments
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage their own income entries"
  on income_entries
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

-- PostgREST requires explicit table-level GRANT alongside RLS policies —
-- granting all four tables explicitly here avoids relying on a project's
-- default privileges, which have proven inconsistent across tables.
grant select, insert, update, delete on table public.profiles
  to authenticated, anon, service_role;
grant select, insert, update, delete on table public.services
  to authenticated, anon, service_role;
grant select, insert, update, delete on table public.appointments
  to authenticated, anon, service_role;
grant select, insert, update, delete on table public.income_entries
  to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Signup trigger
-- ---------------------------------------------------------------------------

-- Auto-create a profiles row for every new auth user so the app never has to
-- handle a missing profile. Runs with the function owner's privileges to
-- bypass RLS during the insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Backstop trigger: service ownership + amount_earned snapshot invariant
-- ---------------------------------------------------------------------------

-- Validates two things the WITH CHECK RLS policy cannot express:
--   1. A referenced service_id must belong to the same user.
--   2. amount_earned must match price_snapshot * commission_pct_snapshot / 100.
-- The amount check allows a one-cent tolerance because the source of truth is
-- the client-side rounding in calc.ts; this only guards against corruption or
-- a tampered client, not the exact rounding mode.
create or replace function public.validate_income_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected numeric;
begin
  if new.service_id is not null then
    if not exists (
      select 1 from public.services s
      where s.id = new.service_id and s.user_id = new.user_id
    ) then
      raise exception 'service_id % does not belong to user %',
        new.service_id, new.user_id;
    end if;
  end if;

  expected := round(new.price_snapshot * new.commission_pct_snapshot / 100, 2);
  if abs(new.amount_earned - expected) > 0.01 then
    raise exception
      'amount_earned % does not match price_snapshot * commission_pct_snapshot / 100 (expected ~%)',
      new.amount_earned, expected;
  end if;

  return new;
end;
$$;

create trigger income_entries_validate
  before insert or update on income_entries
  for each row
  execute function public.validate_income_entry();

-- ---------------------------------------------------------------------------
-- Atomic insert: one appointment + its line items in a single transaction
-- ---------------------------------------------------------------------------

-- Runs as the caller (security invoker) so RLS and the income_entries
-- ownership/amount backstop trigger still apply. amount_earned is supplied
-- by the client (computed via src/lib/calc.ts) — this function never
-- computes it, honoring the snapshot invariant. The function body is one
-- transaction, so either the appointment and all its lines persist or
-- nothing does.
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

grant execute on function public.create_appointment(date, text, text, numeric, jsonb)
  to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Atomic edit: update one appointment + replace its line items
-- ---------------------------------------------------------------------------

-- Mirrors create_appointment: runs as the caller (security invoker) so RLS
-- and the backstop trigger still apply. Line items are replaced wholesale
-- (delete + re-insert) rather than diffed; created_at and source on the
-- appointment are preserved (not overwritten).
create or replace function public.update_appointment(
  p_id uuid,
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
  update public.appointments
  set provided_on = p_provided_on,
      customer = p_customer,
      note = p_note,
      tip = coalesce(p_tip, 0)
  where id = p_id and user_id = auth.uid()
  returning * into v_appointment;

  if not found then
    raise exception 'appointment % not found', p_id;
  end if;

  delete from public.income_entries where appointment_id = p_id;

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

grant execute on function public.update_appointment(uuid, date, text, text, numeric, jsonb)
  to authenticated, anon;
