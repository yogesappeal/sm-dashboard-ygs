'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store'
import type { UserRole } from '@/lib/store'
import { getUserDetails } from '@/lib/api'
import type { BackendUserRole } from '@/lib/types'

// Access is driven by the backend's `role` enum (admin/site_manager/ops),
// NOT job_title — job_title is display-only. Anything outside this enum
// (including a missing/unrecognized value) is blocked at the gate below.
function mapBackendRoleToRole(role: BackendUserRole | undefined): UserRole {
  switch (role) {
    case 'site_manager': return 'Site Manager'
    case 'ops': return 'Operations'
    case 'admin': return 'Admin'
    default: return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setRole, setToken, setLoading, setAccessDenied, isLoading, accessDenied, clear } = useAuthStore()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function loadProfile(accessToken: string) {
      setToken(accessToken)
      try {
        const res = await getUserDetails(accessToken)
        if (res?.data) {
          setUser(res.data)
          const role = mapBackendRoleToRole(res.data.role)
          setRole(role)
          setAccessDenied(role === null)
        }
      } catch {
        // user details fetch failed — fail open (non-fatal), same as before;
        // don't touch accessDenied here, only an explicit disallowed
        // job_title should block access.
      }
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await loadProfile(session.access_token)
      }
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.access_token) {
          await loadProfile(session.access_token)
        } else {
          setToken(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setRole, setToken, setLoading, setAccessDenied, supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    clear()
    router.push('/login')
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold text-slate-800 mb-2">Access Restricted</h1>
          <p className="text-sm text-slate-500 mb-6">
            Your account role doesn&apos;t have access to this application. Please contact your administrator if you believe this is a mistake.
          </p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-medium text-white bg-[#6692C5] hover:bg-[#4F7CB3] rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
