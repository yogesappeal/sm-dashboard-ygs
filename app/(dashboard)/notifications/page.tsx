'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Package, AlertCircle, Filter } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getPurchaseOrderDetailsFull } from '@/lib/api'
import {
  useNotificationsList,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/lib/hooks/use-notifications'
import { PaginationBar } from '@/components/ui/pagination-bar'
import type { NotificationItem, NotificationType } from '@/lib/types'

const iconMap: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  po_rescheduled: { icon: Package, bg: 'bg-amber-50', color: 'text-amber-500' },
  po_completed: { icon: Package, bg: 'bg-emerald-50', color: 'text-emerald-500' },
  po_rejected: { icon: Package, bg: 'bg-red-50', color: 'text-red-500' },
}
const defaultIcon = { icon: AlertCircle, bg: 'bg-slate-50', color: 'text-slate-400' }

function iconFor(type: NotificationType) {
  return iconMap[type] ?? defaultIcon
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function groupByDate(items: NotificationItem[]) {
  return items.reduce<Record<string, NotificationItem[]>>((acc, n) => {
    const key = formatDate(n.created_at)
    if (!acc[key]) acc[key] = []
    acc[key].push(n)
    return acc
  }, {})
}

const FILTERS: { label: string; value: 'all' | 'unread' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
]

export default function NotificationsPage() {
  const router = useRouter()
  const { token } = useAuthStore()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useNotificationsList({
    page,
    limit: 20,
    unreadOnly: filter === 'unread',
  })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data?.data ?? []
  const unreadCount = data?.unread_count ?? 0
  const totalPages = data?.pagination.total_pages ?? 1
  const grouped = groupByDate(notifications)

  const handleFilterChange = useCallback((value: 'all' | 'unread') => {
    setFilter(value)
    setPage(1)
  }, [])

  const handleNotificationClick = useCallback(
    async (n: NotificationItem) => {
      if (!n.is_read) markRead.mutate(n.id)

      if (n.source_table === 'po.purchase_orders' && n.source_id && token) {
        try {
          const po = await getPurchaseOrderDetailsFull(token, n.source_id)
          router.push(`/purchase-orders/${po.type}/${n.source_id}`)
        } catch {
          // PO may have been deleted or the lookup failed — stay put rather
          // than navigating to a broken page.
        }
      }
    },
    [markRead, token, router]
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 text-sm text-[#6692C5] hover:text-[#4F7CB3] font-medium transition-colors disabled:opacity-50"
          >
            <CheckCheck size={15} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-slate-400 shrink-0" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-[#6692C5] text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-[#6692C5]/50 hover:text-[#6692C5]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center gap-3 text-slate-400">
          <p className="text-sm">Loading…</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center gap-3 text-slate-400">
          <Bell size={36} strokeWidth={1.5} />
          <p className="text-sm">No notifications</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">{date}</p>
              <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
                {items.map((n) => {
                  const { icon: Icon, bg, color } = iconFor(n.type)
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className="flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-slate-50"
                    >
                      <div className={`mt-0.5 p-2.5 rounded-xl shrink-0 ${bg}`}>
                        <Icon size={16} className={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-sm leading-snug ${n.is_read ? 'text-slate-700 font-normal' : 'text-slate-900 font-semibold'}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatTime(n.created_at)}</span>
                            {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#6692C5] shrink-0" />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <PaginationBar
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                isRefreshing={isFetching}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
