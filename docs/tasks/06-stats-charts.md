# Task 06 — Stats & Charts

## Goal

A stats dashboard showing total income over time and a breakdown by service type using Recharts.

## Files

- `src/features/stats/aggregations.ts` — pure functions (uses `src/lib/calc.ts`):
  - `groupByPeriod(entries, period: 'week'|'month'|'year')` → `{ label: string, total: number }[]`
  - `groupByService(entries)` → `{ name: string, total: number }[]`
- `src/features/stats/useStats.ts` — TanStack Query hook that fetches all entries for the logged-in user.
- `src/features/stats/StatsPage.tsx` — page component.

## Charts

### Total Income Over Time (Bar or Line chart)
- X-axis: period labels (e.g. week numbers, month names).
- Y-axis: `amount_earned` summed per period.
- Period toggle: **Week / Month / Year** (defaults to Month).

### Income by Service (Pie chart)
- Each slice = one service, sized by total `amount_earned`.
- Legend shows service name + total + %.

## Summary Row

Above the charts, show three summary cards:
- Total all-time earnings.
- Total this month.
- Number of services logged this month.

## Acceptance Criteria

- Charts render with real data from `income_entries`.
- Switching the period toggle updates the bar/line chart.
- Adding a new entry (Task 05) and returning to stats reflects the new total.
- With no entries, charts show an empty state message (not a broken chart).
- `groupByPeriod` and `groupByService` are unit-tested in `src/features/stats/aggregations.test.ts`.
