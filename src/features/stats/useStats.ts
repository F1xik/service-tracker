import { useQuery } from '@tanstack/react-query'

import { getAllEntries } from '@/features/income/api'

// Shares the `['income-entries', ...]` prefix so the invalidation in
// useCreateEntries / useDeleteEntry also refreshes the stats history.
const allEntriesKey = ['income-entries', 'all'] as const

export function useStats() {
  return useQuery({ queryKey: allEntriesKey, queryFn: getAllEntries })
}
