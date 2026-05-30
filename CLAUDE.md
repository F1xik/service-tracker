# Service Income Tracker

PWA for freelancers to track service income. React 18 + TypeScript + Vite + Tailwind CSS + Supabase (Postgres + Auth + RLS). See `docs/plan.md` for tech stack rationale; `docs/tasks/` for task acceptance criteria.

## Stack constraints

- **Data fetching**: TanStack Query only — never `useEffect` + fetch/supabase in components. All Supabase calls in `src/features/*/api.ts`; hooks in `src/features/*/use*.ts`.
- **Forms**: react-hook-form + Zod. No `useState` for form fields, no uncontrolled inputs.
- **Styling**: Tailwind CSS only. No inline styles, no CSS modules.
- **Supabase client**: single instance from `src/lib/supabase.ts`. Never call `createClient` anywhere else.
- **Charts**: Recharts only. Do not add other charting libraries.

## Data model invariant — income_entries snapshots

On every income entry insert, copy and store:
- `price_snapshot` — from `services.price` at insert time
- `commission_pct_snapshot` — from `profiles.commission_pct` at insert time
- `amount_earned` — equals `price_snapshot × (commission_pct_snapshot / 100)`

These are **never recalculated after insert**. Editing a service price or commission % must not touch existing entries. The formula lives in `src/lib/calc.ts` (`computeEarnings(price, commissionPct)`). Always call it explicitly on insert; do not rely on a DB trigger or default.

## RLS — never bypass

All tables have Row Level Security keyed to `auth.uid()`. Never use the service role key in frontend code. Never call `.from(...)` without an active session. Unauthenticated calls return 0 rows by policy — this is correct and expected, not an error to work around.

## Environment variables

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Only these two. Both are `VITE_`-prefixed (Vite public env). Always read from `import.meta.env`. Never hardcode values.

## File structure

```
src/
  lib/supabase.ts           # client init only
  lib/calc.ts               # pure functions — zero React imports, unit-testable
  lib/importers/index.ts    # parser registry
  lib/importers/csv.ts      # CSV parser (PapaParse)
  features/auth/
  features/services/
  features/income/
  features/stats/
  features/import/
  components/ui/            # shared presentational components only
  routes/
supabase/migrations/        # SQL DDL only
```

`calc.ts` must have zero React imports — it is unit-tested in isolation and must stay Capacitor-compatible.

## Tasks

Implement in order 01 → 08. Each `docs/tasks/NN-*.md` file has acceptance criteria — treat them as the definition of done.
