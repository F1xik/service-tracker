import { useQuery } from '@tanstack/react-query'

import { getAllAppointments } from '@/features/income/api'

// Shares the `['appointments', ...]` prefix so the invalidation in
// useCreateAppointment / useDeleteAppointment also refreshes the stats history.
const allAppointmentsKey = ['appointments', 'all'] as const

export function useStats() {
  return useQuery({ queryKey: allAppointmentsKey, queryFn: getAllAppointments })
}
