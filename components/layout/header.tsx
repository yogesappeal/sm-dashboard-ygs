'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore, useAppStore } from '@/lib/store'
import { getGreeting } from '@/lib/utils'
import { LogOut, Bell, Menu } from 'lucide-react'
import { initials } from '@/lib/utils/format'

export function Header() {
  const router = useRouter()
  const { user, role, clear } = useAuthStore()
  const { setMobileSidebarOpen } = useAppStore()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    clear()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
      {/* Left: hamburger (mobile) + greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors md:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <p className="text-sm text-slate-500">{getGreeting()},</p>
          <p className="text-sm font-semibold text-slate-800 leading-tight">
            {user?.fullName || user?.firstName || 'User'}
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {role && (
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-[#C66EEB] border border-purple-100">
            {role}
          </span>
        )}

        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
          <Bell size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#C66EEB] flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {user ? initials(user.fullName || `${user.firstName} ${user.lastName}`) : '?'}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
