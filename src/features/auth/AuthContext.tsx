import { createContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface SignUpResult {
  /** True when Supabase requires email confirmation before a session exists. */
  needsEmailConfirmation: boolean
}

interface AuthContextValue {
  session: Session | null
  initializing: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session)
      })
      .catch(() => {
        // Session restore failed (network/storage). Treat as signed-out rather
        // than leaving the app stuck on a blank initializing screen forever.
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setInitializing(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(
    email: string,
    password: string,
    displayName?: string,
  ): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { display_name: displayName } : undefined,
        emailRedirectTo: `${window.location.origin}/sign-in`,
      },
    })
    if (error) throw error
    // When confirmation is required Supabase returns a user but no session.
    return { needsEmailConfirmation: !data.session }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ session, initializing, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
