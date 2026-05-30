# Task 05 — Log Income Flow

## Goal

The primary daily-use screen: the user picks a service, optionally fills in details, and saves an income entry. This is the home page (`/`).

## Files

- `src/features/income/api.ts` — Supabase queries: `createEntry`, `getEntries`, `deleteEntry`.
- `src/features/income/useIncome.ts` — TanStack Query hooks.
- `src/features/income/LogIncomePage.tsx` — page component.
- `src/features/income/EntryForm.tsx` — the log form.
- `src/lib/calc.ts` — `computeEarnings(price: number, commissionPct: number): number` (already scaffolded in Task 01).

## Form Fields

| Field | Type | Notes |
|---|---|---|
| Service | select | Only active services. Selecting one prefills Price. |
| Price | number | Prefilled from service, editable (user may apply a discount). |
| Date | date | Defaults to today. |
| Customer | text | Optional. |
| Note | text | Optional. |

## On Save

1. Read `profiles.commission_pct` from context / cache.
2. Call `computeEarnings(price, commissionPct)` → `amount_earned`.
3. Insert into `income_entries` with snapshots: `price_snapshot = price`, `commission_pct_snapshot = commissionPct`, `amount_earned`.
4. Invalidate the entries query so the recent list refreshes.

## Recent Entries List

Below the form, show the last 10–20 entries (date, service name, amount earned). Include a delete button per entry (for mistakes).

## Acceptance Criteria

- Selecting a service prefills the price field.
- Saving an entry inserts a row in `income_entries` with correct snapshot values.
- `amount_earned` equals `price × (commission_pct / 100)` — verified in Supabase table editor.
- Editing the service's price after an entry is saved does **not** change the entry's `amount_earned`.
- Deleting an entry removes it from the list and the database.
- Form resets after a successful save.
