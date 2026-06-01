'use client'

import { useAuthStore, useAppStore } from '@/lib/store'
import { getGreeting } from '@/lib/utils'
import { Bell, Menu } from 'lucide-react'

export function Header() {
  const { user, role } = useAuthStore()
  const { setMobileSidebarOpen } = useAppStore()

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
            {user?.full_name || user?.first_name || 'User'}
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
      </div>
    </header>
  )
}
