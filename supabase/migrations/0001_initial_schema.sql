-- Task 02 — Initial schema, RLS policies, and signup trigger
-- Creates the core tables for the service tracker app: profiles, services,
-- and income_entries. Row Level Security restricts every row to its owner,
-- and a signup trigger guarantees each new auth user has a profile row.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  commission_pct numeric not null default 0,
  currency text not null default 'PLN',
  created_at timestamptz not null default now()
);

create table services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  price numeric not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  service_id uuid references services on delete set null,
  provided_on date not null default current_date,
  price_snapshot numeric not null,
  commission_pct_snapshot numeric not null,
  amount_earned numeric not null,
  customer text,
  note text,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

-- Indexes to keep per-user lookups and date filtering fast.
create index services_user_id_idx on services (user_id);
create index income_entries_user_id_idx on income_entries (user_id);
create index income_entries_service_id_idx on income_entries (service_id);
create index income_entries_provided_on_idx on income_entries (provided_on);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table services enable row level security;
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

create policy "Users manage their own income entries"
  on income_entries
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

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
