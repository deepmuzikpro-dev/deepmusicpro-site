import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [banned, setBanned] = useState(false)

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data?.is_banned) {
      // Banned accounts are signed out client-side the moment their profile
      // loads. This blocks the app UI; it doesn't revoke the underlying
      // Supabase session token, which an admin can do from the dashboard if
      // needed.
      setBanned(true)
      setProfile(null)
      await supabase.auth.signOut()
      return
    }
    setBanned(false)
    setProfile(data || null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user?.id)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const signUp = (email, password, displayName, refCode) =>
    supabase.auth.signUp({
      email,
      password,
      // ref_code (from a shared /signup?ref=CODE link) is read by the
      // handle_new_user trigger (0008_marketplace.sql) to link the new
      // profile's referred_by, powering the affiliate program.
      options: { data: { display_name: displayName, ref_code: refCode || null } },
    })

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, isAdmin, banned, signUp, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
