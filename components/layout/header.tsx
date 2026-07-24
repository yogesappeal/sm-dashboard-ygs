'use client'

import { useState } from 'react'
import { useAuthStore, useAppStore } from '@/lib/store'
import { Bell, Menu, LayoutGrid } from 'lucide-react'
import Image from 'next/image'
import { GlobalSearch } from './global-search'
import { NotificationPanel } from './notification-panel'
import { ToolboxPanel } from './toolbox-panel'
import { PermissionGuard } from '@/components/shared/permission-guard'
import { useNotificationsUnreadCount } from '@/lib/hooks/use-notifications'

const STORAGE_BASE = 'https://exlknzxmmqnehvximbyj.supabase.co'

export function Header() {
  const { user } = useAuthStore()
  const { setMobileSidebarOpen } = useAppStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [toolboxOpen, setToolboxOpen] = useState(false)
  const { data: unreadCount = 0 } = useNotificationsUnreadCount()

  const initials = user?.first_name?.[0]?.toUpperCase() ?? '?'
  const avatarUrl = user?.image_url
    ? user.image_url.startsWith('http')
      ? user.image_url
      : `${STORAGE_BASE}/${user.image_url.replace(/^\/+/, '')}`
    : null

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center gap-4 px-4 md:px-6 sticky top-0 z-10">

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors md:hidden shrink-0"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-md">
        <GlobalSearch />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right cluster */}
      <div className="flex items-center gap-3 shrink-0">

        {/* SM Toolbox */}
        <PermissionGuard action="toolbox:view">
          <div className="relative">
            <button
              onClick={() => setToolboxOpen((v) => !v)}
              className="relative p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
              aria-label="SM Toolbox"
            >
              <LayoutGrid size={18} />
            </button>
            <ToolboxPanel open={toolboxOpen} onClose={() => setToolboxOpen(false)} />
          </div>
        </PermissionGuard>

        {/* Notification bell + panel */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#6692C5]" />
            )}
          </button>
          <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* User info + avatar */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-sm font-semibold text-slate-800 leading-tight">
              {user?.full_name || user?.first_name || 'User'}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">
              {user?.job_title === 'Ops' ? 'Operations' : user?.job_title}
            </p>
          </div>

          {avatarUrl ? (
            <div className="relative w-9 h-9 shrink-0">
              <Image
                src={avatarUrl}
                alt={user?.full_name ?? 'avatar'}
                fill
                className="rounded-full object-cover ring-2 ring-[#6692C5]/20"
              />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#6692C5]/10 border border-[#6692C5]/20 flex items-center justify-center shrink-0">
              <span className="text-[#6692C5] text-sm font-semibold">{initials}</span>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
