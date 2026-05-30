# Service Income Tracker — Plan

## Context

Greenfield project. The user provides services to customers and wants to:
- Create an account (auth)
- Maintain a list of services they offer, each with a price
- Apply a single commission percentage (their cut of the total price) that applies to **all** services
- Record income by picking a service from the list each time one is provided
- See simple, clean stats/charts (total income per period, split by service type)
- Import existing history from a local file (format TBD — pluggable parser)

Constraints:
- **Free tier only** (Supabase + Vercel)
- **< 10 users** initially
- **Plain React + Vite PWA** frontend (phone-friendly, installable). Clean UI ↔ logic split so a future **Capacitor** wrap into a real App Store iOS app reuses ~100% of code.
- Charts: **simple & clean** (Recharts)

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + **Vite** | Fast, simple, standard web |
| PWA | **vite-plugin-pwa** (Workbox) | First-class installable/offline PWA, auto service worker |
| Styling | **Tailwind CSS** | Phone-first responsive |
| Routing | **React Router** | Standard client routing |
| Data fetching | **TanStack Query** | Caching, loading/error states over Supabase calls |
| Forms/validation | **Zod** + react-hook-form | Shared validation for forms AND import parsing |
| Charts | **Recharts** | Lightweight, clean line/pie/bar charts |
| Backend | **Supabase** | Free tier: Postgres + Auth + RLS |
| Hosting | **Vercel** (frontend) + Supabase (backend) | Free tier, simple deploy |

## Data Model (Supabase / Postgres)

All tables keyed to `auth.users` with **Row Level Security**.

- **profiles** — `id (=auth.uid)`, `display_name`, `commission_pct numeric`, `currency text default 'USD'`, `created_at`
- **services** — `id`, `user_id`, `name`, `price numeric`, `active bool default true`, `created_at`
- **income_entries** — `id`, `user_id`, `service_id (fk)`, `provided_on date`, `price_snapshot numeric`, `commission_pct_snapshot numeric`, `amount_earned numeric`, `customer text null`, `note text null`, `source text default 'manual'`, `created_at`

Snapshotting `price`/`commission_pct`/`amount_earned` on each entry keeps historical stats correct when values change later.

## Code Structure

```
src/
  lib/
    supabase.ts          # Supabase client init
    calc.ts              # pure earnings/aggregation functions (no React, unit-testable)
    importers/
      index.ts           # registry: pick parser by format
      csv.ts             # default CSV parser
  features/
    auth/                # sign up / sign in / session
    services/            # CRUD list of services + commission setting
    income/              # log income: pick service -> record entry
    stats/               # charts: total per period, split by service
    import/              # upload file -> preview -> confirm import
  components/ui/         # reusable presentational components
  routes/                # route definitions / pages
supabase/
  migrations/            # SQL: tables + RLS policies
```

## Tasks

See `docs/tasks/` for individual task files.

> **Prerequisite:** Task 00 is a **manual, user-actioned** setup (create Supabase + Vercel
> accounts, provision the project, apply the schema, record env vars). It must be done before
> Task 02. See `docs/tasks/00-provisioning.md`.

| # | Task | Status |
|---|---|---|
| 00 | Provision Supabase & Vercel (manual, do first) | |
| 01 | Project scaffold & PWA config | ✅ Done |
| 02 | Supabase schema & migrations | ✅ Done |
| 03 | Auth (sign up / sign in / session) | |
| 04 | Services & commission settings | |
| 05 | Log income flow | |
| 06 | Stats & charts | |
| 07 | Import from file | |
| 08 | README & deploy docs | |

## Notes / Deferred

- Import file format is not finalized — CSV is the default; the real format slots in behind the same `importers` registry once provided.
- When Capacitor wrapping is desired: point it at the Vite build output, add desired native plugins. No app code changes needed.
