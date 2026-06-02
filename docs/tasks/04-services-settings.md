# Task 04 — Services & Commission Settings

## Goal

A screen where the user can manage their list of services (name + price, activate/deactivate) and set their account-wide commission percentage.

## Files

- `src/features/services/api.ts` — Supabase queries: `getServices`, `createService`, `updateService`, `deleteService`, `getProfile`, `updateProfile`.
- `src/features/services/useServices.ts` — TanStack Query hooks wrapping the above.
- `src/features/services/ServicesPage.tsx` — page component (list + add/edit form + commission setting).
- `src/features/services/ServiceForm.tsx` — add/edit form (name, price, active toggle).

## Behaviour

- List all active (and optionally inactive) services for the logged-in user.
- **Add**: form with name (required, max 100 chars) and price (positive number).
- **Edit**: inline or modal edit of name and price.
- **Deactivate / reactivate**: toggle `active`; deactivated services don't appear in the income log picker.
- **Commission %**: a single numeric input (0–100) stored on `profiles.commission_pct`. Changes apply to future entries only (past entries snapshot the old value).
- **Currency**: optional selector (default PLN) stored on `profiles.currency`.

## Forms

`react-hook-form` + `zod`:
- `name`: non-empty string.
- `price`: positive number.
- `commission_pct`: number between 0 and 100.

## Acceptance Criteria

- Adding a service persists it to the `services` table and it appears in the list immediately (optimistic update or query invalidation).
- Editing a service updates the row; the list reflects the new values.
- Deactivating a service hides it from the income log picker (Task 05) but keeps its history.
- Saving a new commission % updates `profiles.commission_pct`; the new value is shown on next page load.
