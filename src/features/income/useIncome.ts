import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createEntries, deleteEntry, getEntries, type CreateEntriesInput } from './api'

const entriesKey = ['income-entries'] as const

export function useEntries(limit = 20) {
  return useQuery({ queryKey: entriesKey, queryFn: () => getEntries(limit) })
}

export function useCreateEntries() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateEntriesInput) => createEntries(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: entriesKey }),
  })
}

export function useDeleteEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: entriesKey }),
  })
}
