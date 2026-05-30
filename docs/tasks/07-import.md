# Task 07 — Import from File

## Goal

Allow the user to upload a local file containing historical income entries, preview the parsed rows, and bulk-insert them into `income_entries` with `source = 'import'`.

## Files

- `src/lib/importers/index.ts` — registry: `getParser(format: string): Parser`.
- `src/lib/importers/csv.ts` — default CSV parser (PapaParse). Maps columns → `ImportRow`.
- `src/lib/importers/types.ts` — `ImportRow` type (normalised intermediate shape).
- `src/features/import/api.ts` — `bulkInsertEntries(rows: ImportRow[])`.
- `src/features/import/ImportPage.tsx` — page component (upload → preview → confirm).

## ImportRow Type

```ts
type ImportRow = {
  provided_on: string;      // ISO date
  service_name: string;     // matched to existing services by name (case-insensitive)
  price: number;
  customer?: string;
  note?: string;
}
```

## Flow

1. **Upload**: file input (drag-and-drop or tap to browse). Detect format by extension (`.csv` → csv parser; extendable).
2. **Parse**: run the matching parser → array of `ImportRow`. Validate each row with Zod. Rows with errors are flagged but don't block the rest.
3. **Preview**: table showing all parsed rows. Invalid rows are highlighted in red with the error reason. User can proceed with valid rows only.
4. **Confirm**: bulk insert valid rows. For each row, look up `service_id` by matching `service_name` against the user's services (null if no match — entry is still inserted). Apply current `commission_pct` snapshot at import time (or 0 if unknown). Set `source = 'import'`.
5. **Result**: show a success summary ("X entries imported, Y skipped").

## Notes

- The exact CSV column names/format are TBD. The `csv.ts` parser should have the column mapping in one clearly labelled place so it's easy to adjust.
- Importing the same file twice will create duplicates — no deduplication logic required yet.

## Acceptance Criteria

- Uploading a valid CSV file shows a preview table with correct data.
- Rows failing Zod validation are shown in red with an error message; valid rows still proceed.
- After confirmation, the imported entries appear in the income log and stats.
- All imported entries have `source = 'import'` in the database.
- An unknown service name results in `service_id = null` but the entry is still imported.
