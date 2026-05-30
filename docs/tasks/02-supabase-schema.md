# Task 02 — Supabase Schema & Migrations

## Goal

Create the database schema, RLS policies, and a signup trigger in `supabase/migrations/` so the project has a reproducible, version-controlled database setup.

## Tables

### profiles
```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  commission_pct numeric not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);
```

### services
```sql
create table services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  price numeric not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
```

### income_entries
```sql
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
```

## RLS Policies

Enable RLS on all three tables. Each table gets a single policy: `user_id = auth.uid()` (or `id = auth.uid()` for `profiles`).

## Signup Trigger

A `before insert on auth.users` (or `after insert`) trigger that auto-inserts a row into `profiles` for every new user, so the app never has to handle a missing profile.

## Steps

1. Create `supabase/migrations/0001_initial_schema.sql` with all DDL above.
2. Apply locally with `supabase db reset` (or push to the hosted project via `supabase db push`).
3. Verify in the Supabase table editor that the three tables exist with the correct columns.

## Acceptance Criteria

- Migration file exists at `supabase/migrations/0001_initial_schema.sql`.
- All three tables present with correct columns and types.
- RLS is enabled; a logged-out query returns 0 rows.
- Signing up creates a matching `profiles` row automatically.
