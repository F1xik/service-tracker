import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  type CreateAppointmentInput,
} from './api'

const appointmentsKey = ['appointments'] as const

export function useAppointments(limit = 20) {
  return useQuery({
    queryKey: appointmentsKey,
    queryFn: () => getAppointments(limit),
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
