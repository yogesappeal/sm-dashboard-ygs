'use client'

import { useState } from 'react'
import { Bell, CheckCheck, FileText, ClipboardList, Package, AlertCircle, Filter } from 'lucide-react'
import { NOTIFICATIONS, NOTIF_UNREAD_COUNT } from '@/lib/data/notifications'
import type { NotifType, Notification } from '@/lib/data/notifications'

const iconMap: Record<NotifType, { icon: React.ElementType; bg: string; color: string; label: string }> = {
  contract: { icon: FileText,      bg: 'bg-purple-50', color: 'text-[#C66EEB]', label: 'Contract'  },
  task:     { icon: ClipboardList, bg: 'bg-amber-50',  color: 'text-amber-500', label: 'Task'      },
  po:       { icon: Package,       bg: 'bg-blue-50',   color: 'text-blue-500',  label: 'PO'        },
  alert:    { icon: AlertCircle,   bg: 'bg-red-50',    color: 'text-red-500',   label: 'Alert'     },
}

const FILTERS: { label: string; value: NotifType | 'all' }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Contract', value: 'contract' },
  { label: 'Task',     value: 'task'     },
  { label: 'PO',       value: 'po'       },
  { label: 'Alert',    value: 'alert'    },
]

function groupByDate(items: Notification[]) {
  return items.reduce<Record<string, Notification[]>>((acc, n) => {
    if (!acc[n.date]) acc[n.date] = []
    acc[n.date].push(n)
    return acc
  }, {})
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotifType | 'all'>('all')
  const [notifications, setNotifications] = useState(NOTIFICATIONS)

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  const markRead = (id: string) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter)
  const unread = notifications.filter((n) => !n.read).length
  const grouped = groupByDate(filtered)

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm text-[#C66EEB] hover:text-purple-700 font-medium transition-colors"
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
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-[#C66EEB] text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-purple-300 hover:text-[#C66EEB]'
            }`}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1 opacity-70">
                ({notifications.filter((n) => n.type === f.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      {filtered.length === 0 ? (
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
                  const { icon: Icon, bg, color } = iconMap[n.type]
                  return (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-slate-50 ${!n.read ? 'bg-purple-50/40' : ''}`}
                    >
                      <div className={`mt-0.5 p-2.5 rounded-xl shrink-0 ${bg}`}>
                        <Icon size={16} className={color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-sm leading-snug ${n.read ? 'text-slate-700 font-normal' : 'text-slate-900 font-semibold'}`}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-400 whitespace-nowrap">{n.time}</span>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-[#C66EEB] shrink-0" />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
