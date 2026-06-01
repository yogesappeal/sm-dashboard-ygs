'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import { getUserDetails } from '@/lib/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setRole, setToken, setLoading } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        setToken(session.access_token)
        try {
          const res = await getUserDetails(session.access_token)
          if (res?.data) {
            setUser(res.data)
            // Role comes from user metadata set during registration or user_details table
            const metaRole = session.user?.user_metadata?.role
            setRole(
              metaRole === 'Operations' ? 'Operations' : 'Site Manager'
            )
          }
        } catch {
          // user details fetch failed, non-fatal
        }
      }
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.access_token) {
          setToken(session.access_token)
        } else {
          setToken(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setRole, setToken, setLoading, supabase])

  return <>{children}</>
}
