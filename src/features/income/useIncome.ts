import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createAppointment,
  deleteAppointment,
  getAppointmentsPage,
  type CreateAppointmentInput,
} from './api'

const appointmentsKey = ['appointments'] as const

/** Page size for the income-history "load more" pagination. */
export const PAGE_SIZE = 20

export interface AppointmentsRange {
  from?: string
  to?: string
}

/**
 * Paginated income history for a `provided_on` window, newest first.
 *
 * The range is part of the query key, so changing the window starts a fresh
 * paginated cache rather than mixing pages from different windows. `count` from
 * each page tells us when there is nothing more to load.
 */
export function useInfiniteAppointments(range: AppointmentsRange) {
  return useInfiniteQuery({
    queryKey: [...appointmentsKey, range] as const,
    queryFn: ({ pageParam }) =>
      getAppointmentsPage({
        from: range.from,
        to: range.to,
        offset: pageParam,
        limit: PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.rows.length, 0)
      return loaded < lastPage.count ? loaded : undefined
    },
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
