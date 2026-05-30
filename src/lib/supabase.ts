import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY in your .env file (see .env.example).',
  )
}

/**
 * Single shared Supabase client for the whole app.
 *
 * Never call `createClient` anywhere else — import this instance instead.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
