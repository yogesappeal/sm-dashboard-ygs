'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Package, AlertCircle } from 'lucide-react'
import {
  useNotificationsList,
  useNotificationsUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/lib/hooks/use-notifications'
import { useAuthStore } from '@/lib/store'
import { getPurchaseOrderDetailsFull } from '@/lib/api'
import type { NotificationItem, NotificationType } from '@/lib/types'

const iconMap: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  po_rescheduled: { icon: Package, bg: 'bg-amber-50', color: 'text-amber-500' },
  po_completed: { icon: Package, bg: 'bg-emerald-50', color: 'text-emerald-500' },
  po_rejected: { icon: Package, bg: 'bg-red-50', color: 'text-red-500' },
}
// Fallback for notification types not in iconMap yet — `type` is free-form
// on the backend, new trigger events add new values over time.
const defaultIcon = { icon: AlertCircle, bg: 'bg-slate-50', color: 'text-slate-400' }

function iconFor(type: NotificationType) {
  return iconMap[type] ?? defaultIcon
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

interface Props {
  open: boolean
  onClose: () => void
}

export function NotificationPanel({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { token } = useAuthStore()

  const { data, isLoading } = useNotificationsList({ limit: 10, enabled: open })
  const { data: unreadCount = 0 } = useNotificationsUnreadCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.data ?? []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const handleNotificationClick = useCallback(
    async (n: NotificationItem) => {
      if (!n.is_read) markRead.mutate(n.id)

      if (n.source_table === 'po.purchase_orders' && n.source_id && token) {
        onClose()
        try {
          const po = await getPurchaseOrderDetailsFull(token, n.source_id)
          router.push(`/purchase-orders/${po.type}/${n.source_id}`)
        } catch {
          // PO may have been deleted or the lookup failed — stay put rather
          // than navigating to a broken page.
        }
        return
      }

      onClose()
    },
    [markRead, token, router, onClose]
  )

  const handleViewAll = () => {
    onClose()
    router.push('/notifications')
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={`absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/60 z-50 overflow-hidden transition-all duration-200 origin-top-right ${
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-50">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-slate-500" />
            <p className="text-sm font-semibold text-slate-800">Notifications</p>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#6692C5] text-white text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#6692C5] transition-colors disabled:opacity-40 disabled:hover:text-slate-400"
          >
            <CheckCheck size={12} />
            Mark all read
          </button>
        </div>

        {/* Preview list */}
        {isLoading ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400">No notifications</div>
        ) : (
          <ul className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {notifications.map((n) => {
              const { icon: Icon, bg, color } = iconFor(n.type)
              return (
                <li key={n.id}>
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-[#6692C5]/5' : ''}`}
                  >
                    <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${bg}`}>
                      <Icon size={14} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-snug ${n.is_read ? 'text-slate-700 font-normal' : 'text-slate-800 font-semibold'}`}>
                          {n.title}
                        </p>
                        {!n.is_read && <span className="mt-1 w-2 h-2 rounded-full bg-[#6692C5] shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-50 text-center">
          <button
            onClick={handleViewAll}
            className="text-xs text-[#6692C5] hover:text-[#4F7CB3] font-medium transition-colors"
          >
            View all notifications →
          </button>
        </div>
      </div>
    </div>
  )
}
