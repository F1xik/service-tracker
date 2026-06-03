import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createAppointment,
  deleteAppointment,
  getAppointmentsDayPage,
  type CreateAppointmentInput,
} from './api'

const appointmentsKey = ['appointments'] as const

export interface AppointmentsRange {
  from?: string
  to?: string
}

/**
 * Paginated income history for a `provided_on` window, newest first.
 *
 * Pages are cut on **day** boundaries (see `getAppointmentsDayPage`), so a day
 * is never split across "load more" — each day's total is correct on first
 * render. The cursor is the `provided_on` upper bound for the next page; the
 * range is part of the query key, so changing the window starts a fresh cache
 * rather than mixing pages from different windows.
 */
export function useInfiniteAppointments(range: AppointmentsRange) {
  return useInfiniteQuery({
    queryKey: [...appointmentsKey, range] as const,
    queryFn: ({ pageParam }) =>
      getAppointmentsDayPage({
        from: range.from,
        to: range.to,
        before: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) => createAppointment(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentsKey }),
  })
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: appointmentsKey }),
  })
}
