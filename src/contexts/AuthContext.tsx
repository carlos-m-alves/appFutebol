import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, name: string, avatar_url?: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
}

const OAUTH_PROVIDER_TOKEN_KEY = 'oauth_provider_token'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(authUserId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      if (session?.provider_token) {
        localStorage.setItem(OAUTH_PROVIDER_TOKEN_KEY, session.provider_token)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
      if (session?.provider_token) {
        localStorage.setItem(OAUTH_PROVIDER_TOKEN_KEY, session.provider_token)
      } else {
        localStorage.removeItem(OAUTH_PROVIDER_TOKEN_KEY)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUp(email: string, password: string, name: string, avatar_url?: string) {
    const metadata: Record<string, string> = { name }
    if (avatar_url) metadata.avatar_url = avatar_url

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    })
    return { error: error?.message ?? null }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' }
      }
    })
    if (error) throw error
  }

  async function signOut() {
    const providerToken = localStorage.getItem(OAUTH_PROVIDER_TOKEN_KEY)
    await supabase.auth.signOut()
    setProfile(null)
    localStorage.removeItem(OAUTH_PROVIDER_TOKEN_KEY)
    if (providerToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${providerToken}`, { method: 'POST', mode: 'no-cors' })
      } catch { }
    }
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`
    })
    return { error: error?.message ?? null }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
