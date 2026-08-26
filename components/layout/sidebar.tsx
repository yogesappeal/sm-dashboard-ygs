'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useAppStore, useAuthStore } from '@/lib/store'
import type { UserRole } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { hasPermission } from '@/lib/permissions'
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  FileText,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  LogOut,
  User,
  Settings,
  Receipt,
} from 'lucide-react'
import type { UserDetails } from '@/lib/types'

const FEATURE_TASK = process.env.NEXT_PUBLIC_FEATURE_TASK === 'true'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/assets/company-logos/mini_logo_ah.png`

interface NavSubItem {
  label: string
  href: string
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  children?: NavSubItem[]
}

function getNavItems(role: UserRole): NavItem[] {
  return [
    { label: 'Home', href: '/', icon: LayoutDashboard },
    { label: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
    { label: 'Suppliers & Subs', href: '/suppliers', icon: Users },
    { label: 'Scope', href: '/scope', icon: FileText },
    // Bills is Site Manager-only right now (see lib/permissions.ts `bill:access`)
    // — hidden from the nav entirely for every other role.
    ...(hasPermission(role, 'bill:access')
      ? [{
          label: 'Bills',
          href: '/bills',
          icon: Receipt,
          children: [
            { label: 'All Bills', href: '/bills' },
            { label: 'Requires My Approval', href: '/bills/requires-my-approval' },
          ],
        }]
      : []),
    ...(FEATURE_TASK && hasPermission(role, 'task:view') ? [{ label: 'Tasks', href: '/tasks', icon: CheckSquare }] : []),
  ]
}

function NavLinks({ pathname, role, collapsed, onLinkClick }: { pathname: string; role: UserRole; collapsed?: boolean; onLinkClick?: () => void }) {
  const navItems = getNavItems(role)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Bills: pathname.startsWith('/bills'),
  })
  const [flyout, setFlyout] = useState<{ label: string; top: number; left: number } | null>(null)
  const flyoutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pathname.startsWith('/bills')) {
      setOpenGroups((prev) => ({ ...prev, Bills: true }))
    }
  }, [pathname])

  // Route change should always close a collapsed-mode flyout.
  useEffect(() => {
    setFlyout(null)
  }, [pathname])

  useEffect(() => {
    if (!flyout) return
    function handleClose(e: MouseEvent) {
      const target = e.target as Node
      if (flyoutRef.current?.contains(target)) return
      setFlyout(null)
    }
    document.addEventListener('mousedown', handleClose)
    return () => document.removeEventListener('mousedown', handleClose)
  }, [flyout])

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const toggleFlyout = (label: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setFlyout((prev) => (prev?.label === label ? null : { label, top: rect.top, left: rect.right + 8 }))
  }

  return (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const isParentActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        const Icon = item.icon
        const hasChildren = !!item.children?.length
        const isGroupOpen = openGroups[item.label] ?? false

        if (hasChildren) {
          // Collapsed sidebar has no room to show an inline submenu, so the
          // group head opens a floating flyout with the same children
          // instead of navigating straight into the first sub-page.
          if (collapsed) {
            const isFlyoutOpen = flyout?.label === item.label
            return (
              <div key={item.label} className="relative">
                <button
                  type="button"
                  onClick={(e) => toggleFlyout(item.label, e)}
                  title={item.label}
                  className={cn(
                    'w-full flex items-center justify-center gap-3 px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    isParentActive || isFlyoutOpen
                      ? 'bg-[#6692C5]/10 text-[#6692C5] border border-[#6692C5]/20'
                      : 'text-[#667085] hover:text-slate-800 hover:bg-slate-100'
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" />
                </button>

                {isFlyoutOpen &&
                  createPortal(
                    <div
                      ref={flyoutRef}
                      className="fixed z-[200] w-52 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden py-1"
                      style={{ top: flyout.top, left: flyout.left }}
                    >
                      <div className="px-3.5 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
                        {item.label}
                      </div>
                      {item.children!.map((child) => {
                        const isChildActive = child.href === '/bills'
                          ? pathname === '/bills' || pathname === '/bills/all'
                          : pathname === child.href

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => {
                              setFlyout(null)
                              onLinkClick?.()
                            }}
                            className={cn(
                              'block px-3.5 py-2 text-xs font-medium transition-colors',
                              isChildActive
                                ? 'bg-[#6692C5] text-white font-semibold'
                                : 'text-[#667085] hover:text-slate-900 hover:bg-slate-100'
                            )}
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>,
                    document.body
                  )}
              </div>
            )
          }

          return (
            <div key={item.label} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isParentActive
                    ? 'bg-[#6692C5]/10 text-[#6692C5]'
                    : 'text-[#667085] hover:text-slate-800 hover:bg-slate-100'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {isGroupOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>

              {isGroupOpen && (
                <div className="pl-6 space-y-1 border-l border-slate-200 ml-4 py-1">
                  {item.children!.map((child) => {
                    const isChildActive = child.href === '/bills'
                      ? pathname === '/bills' || pathname === '/bills/all'
                      : pathname === child.href

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onLinkClick}
                        className={cn(
                          'block px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                          isChildActive
                            ? 'bg-[#6692C5] text-white font-semibold shadow-xs'
                            : 'text-[#667085] hover:text-slate-900 hover:bg-slate-100'
                        )}
                      >
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            title={collapsed ? item.label : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isParentActive
                ? 'bg-[#6692C5]/10 text-[#6692C5] border border-[#6692C5]/20'
                : 'text-[#667085] hover:text-slate-800 hover:bg-slate-100',
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
        className="fixed z-[200] w-52 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        style={{ left: menuStyle.left, bottom: menuStyle.bottom }}
      >
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-slate-800 text-xs font-semibold truncate">{displayName}</p>
          <p className="text-slate-400 text-xs truncate">{user.email}</p>
        </div>
        <div className="py-1">
          <button
            onClick={() => { setOpen(false); router.push('/profile') }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-sm transition-colors"
          >
            <User size={15} />
            Profile
          </button>
          <button
            onClick={() => { setOpen(false); router.push('/settings') }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-50 text-sm transition-colors"
          >
            <Settings size={15} />
            Settings
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:text-red-600 hover:bg-red-50 text-sm transition-colors"
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
    <div className="px-3 py-4 border-t border-slate-100">
      {floatingMenu}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-slate-100 transition-colors text-left',
          collapsed && 'justify-center'
        )}
      >
        {avatarUrl ? (
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image src={avatarUrl} alt={displayName} fill sizes="32px" className="rounded-full object-cover ring-2 ring-[#6692C5]/30" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#6692C5]/10 border border-[#6692C5]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#6692C5] text-xs font-semibold">{initials}</span>
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-slate-800 text-xs font-medium truncate">{displayName}</p>
            <p className="text-slate-400 text-xs truncate">{role}</p>
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
          'fixed inset-y-0 left-0 z-50 flex flex-col w-60 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out md:hidden',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Image src={LOGO_URL} alt="AusHail" width={32} height={32} className="rounded-lg flex-shrink-0" />
            <span className="text-slate-800 font-semibold text-sm">SM Dashboard</span>
          </div>
          <button onClick={closeMobile} className="p-1 text-slate-400 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        <NavLinks pathname={pathname} role={role} onLinkClick={closeMobile} />
        <UserFooter user={user} role={role} />
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out h-screen sticky top-0',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <Image src={LOGO_URL} alt="AusHail" width={32} height={32} className="rounded-lg flex-shrink-0" />
              <span className="text-slate-800 font-semibold text-sm truncate">SM Dashboard</span>
            </div>
          ) : (
            <Image src={LOGO_URL} alt="AusHail" width={32} height={32} className="rounded-lg mx-auto" />
          )}
          {sidebarOpen && (
            <button onClick={toggleSidebar} className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {!sidebarOpen && (
          <button onClick={toggleSidebar} className="mx-auto mt-2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <ChevronRight size={16} />
          </button>
        )}

        <NavLinks pathname={pathname} role={role} collapsed={!sidebarOpen} />
        <UserFooter user={user} role={role} collapsed={!sidebarOpen} />
      </aside>
    </>
  )
}
