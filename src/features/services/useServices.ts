import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createService,
  deleteService,
  getProfile,
  getServices,
  updateProfile,
  updateService,
  type CreateServiceInput,
  type UpdateProfileInput,
  type UpdateServiceInput,
} from './api'

const servicesKey = ['services'] as const
const profileKey = ['profile'] as const

export function useServices() {
  return useQuery({ queryKey: servicesKey, queryFn: getServices })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateServiceInput) => createService(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: servicesKey }),
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateServiceInput }) =>
      updateService(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: servicesKey }),
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteService(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: servicesKey }),
  })
}

export function useProfile() {
  return useQuery({ queryKey: profileKey, queryFn: getProfile })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: UpdateProfileInput) => updateProfile(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  })
}
