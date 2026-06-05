'use client'

import { useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, FileText, ClipboardList, Package, AlertCircle } from 'lucide-react'
import { NOTIFICATIONS, NOTIF_UNREAD_COUNT } from '@/lib/data/notifications'
import type { NotifType } from '@/lib/data/notifications'

const iconMap: Record<NotifType, { icon: React.ElementType; bg: string; color: string }> = {
  contract: { icon: FileText,      bg: 'bg-[#6692C5]/10', color: 'text-[#6692C5]' },
  task:     { icon: ClipboardList, bg: 'bg-amber-50',  color: 'text-amber-500' },
  po:       { icon: Package,       bg: 'bg-blue-50',   color: 'text-blue-500'  },
  alert:    { icon: AlertCircle,   bg: 'bg-red-50',    color: 'text-red-500'   },
}

// Show only latest 5 in the dropdown
const PREVIEW = NOTIFICATIONS.slice(0, 5)

interface Props {
  open: boolean
  onClose: () => void
}

export function NotificationPanel({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

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
            {NOTIF_UNREAD_COUNT > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#6692C5] text-white text-[10px] font-bold">
                {NOTIF_UNREAD_COUNT}
              </span>
            )}
          </div>
          <button className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#6692C5] transition-colors">
            <CheckCheck size={12} />
            Mark all read
          </button>
        </div>

        {/* Preview list */}
        <ul className="max-h-96 overflow-y-auto divide-y divide-slate-50">
          {PREVIEW.map((n) => {
            const { icon: Icon, bg, color } = iconMap[n.type]
            return (
              <li key={n.id}>
                <button className={`w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-[#6692C5]/5' : ''}`}>
                  <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${bg}`}>
                    <Icon size={14} className={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${n.read ? 'text-slate-700 font-normal' : 'text-slate-800 font-semibold'}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="mt-1 w-2 h-2 rounded-full bg-[#6692C5] shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-50 text-center">
          <button
            onClick={handleViewAll}
            className="text-xs text-[#6692C5] hover:text-[#4F7CB3] font-medium transition-colors"
          >
            View all {NOTIFICATIONS.length} notifications →
          </button>
        </div>
      </div>
    </div>
  )
}

export { NOTIF_UNREAD_COUNT as unreadCount }
