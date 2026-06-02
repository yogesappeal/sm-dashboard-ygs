'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useAppStore, useAuthStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  FileText,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  User,
  Settings,
} from 'lucide-react'
import type { UserDetails } from '@/lib/types'

const FEATURE_TASK = process.env.NEXT_PUBLIC_FEATURE_TASK === 'true'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/assets/company-logos/mini_logo_ah.png`

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
  { label: 'Suppliers', href: '/suppliers', icon: Users },
  { label: 'Scope', href: '/scope', icon: FileText },
  ...(FEATURE_TASK ? [{ label: 'Tasks', href: '/tasks', icon: CheckSquare }] : []),
]

function NavLinks({ pathname, collapsed, onLinkClick }: { pathname: string; collapsed?: boolean; onLinkClick?: () => void }) {
  return (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            title={collapsed ? item.label : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-[#C66EEB]/20 text-[#C66EEB] border border-[#C66EEB]/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5',
              collapsed && 'justify-center px-2'
            )}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

function UserFooter({ user, role, collapsed }: { user: UserDetails | null; role: string | null; collapsed?: boolean }) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState({ left: 0, bottom: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { clear } = useAuthStore()
  const supabase = createClient()

  const handleToggle = useCallback(() => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setMenuStyle({
        left: rect.right + 8,
        bottom: window.innerHeight - rect.top,
      })
    }
    setOpen((v) => !v)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClose(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClose)
    return () => document.removeEventListener('mousedown', handleClose)
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    await supabase.auth.signOut()
    clear()
    router.push('/login')
    router.refresh()
  }

  if (!user) return null

  const initials = user.first_name?.[0] ?? '?'
  const displayName = user.full_name || `${user.first_name} ${user.last_name}`
  const avatarUrl = user.image_url
    ? user.image_url.startsWith('http')
      ? user.image_url
      : `https://exlknzxmmqnehvximbyj.supabase.co/${user.image_url.replace(/^\/+/, '')}`
    : null

  const floatingMenu = open
    ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[200] w-52 bg-[#12122a] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
          style={{ left: menuStyle.left, bottom: menuStyle.bottom }}
        >
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-white text-xs font-semibold truncate">{displayName}</p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); router.push('/profile') }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-colors"
            >
              <User size={15} />
              Profile
            </button>
            <button
              onClick={() => { setOpen(false); router.push('/settings') }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-colors"
            >
              <Settings size={15} />
              Settings
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm transition-colors"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <div className="px-3 py-4 border-t border-white/5">
      {floatingMenu}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-white/5 transition-colors text-left',
          collapsed && 'justify-center'
        )}
      >
        {avatarUrl ? (
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image src={avatarUrl} alt={displayName} fill className="rounded-full object-cover ring-2 ring-[#C66EEB]/30" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#C66EEB]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[#C66EEB] text-xs font-semibold">{initials}</span>
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{displayName}</p>
            <p className="text-slate-500 text-xs truncate">{role}</p>
          </div>
        )}
      </button>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore()
  const { user, role } = useAuthStore()

  const closeMobile = () => setMobileSidebarOpen(false)

  return (
    <>
      {/* ── Mobile overlay + drawer ── */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={closeMobile} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-[#1a1a2e] border-r border-white/5 transition-transform duration-300 ease-in-out md:hidden',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Image src={LOGO_URL} alt="AusHail" width={32} height={32} className="rounded-lg flex-shrink-0" />
            <span className="text-white font-semibold text-sm">SM Dashboard</span>
          </div>
          <button onClick={closeMobile} className="p-1 text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <NavLinks pathname={pathname} onLinkClick={closeMobile} />
        <UserFooter user={user} role={role} />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-[#1a1a2e] border-r border-white/5 transition-all duration-300 ease-in-out h-screen sticky top-0',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <Image src={LOGO_URL} alt="AusHail" width={32} height={32} className="rounded-lg flex-shrink-0" />
              <span className="text-white font-semibold text-sm truncate">SM Dashboard</span>
            </div>
          ) : (
            <Image src={LOGO_URL} alt="AusHail" width={32} height={32} className="rounded-lg mx-auto" />
          )}
          {sidebarOpen && (
            <button onClick={toggleSidebar} className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {!sidebarOpen && (
          <button onClick={toggleSidebar} className="mx-auto mt-2 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronRight size={16} />
          </button>
        )}

        <NavLinks pathname={pathname} collapsed={!sidebarOpen} />
        <UserFooter user={user} role={role} collapsed={!sidebarOpen} />
      </aside>
    </>
  )
}
