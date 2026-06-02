import { supabase } from '@/lib/supabase'
import type { Service } from '@/lib/calc'

export interface Profile {
  id: string
  display_name: string | null
  commission_pct: number
  currency: string
  created_at: string
}

export interface CreateServiceInput {
  name: string
  price: number
}

export type UpdateServiceInput = Partial<Pick<Service, 'name' | 'price' | 'active'>>

export type UpdateProfileInput = Partial<Pick<Profile, 'commission_pct' | 'currency'>>

export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createService(input: CreateServiceInput): Promise<Service> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('You must be signed in to add a service.')

  const { data, error } = await supabase
    .from('services')
    .insert({ user_id: user.id, name: input.name, price: input.price })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateService(
  id: string,
  patch: UpdateServiceInput,
): Promise<Service> {
  const { data, error } = await supabase
    .from('services')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteService(id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}

export async function getProfile(): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').single()
  if (error) throw error
  return data
}

export async function updateProfile(patch: UpdateProfileInput): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!user) throw new Error('You must be signed in to update your settings.')

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select()
    .single()
  if (error) throw error
  return data
}
