import { CheckCircle2, CalendarClock, XCircle } from 'lucide-react'
import type { PoResponseAction } from '@/lib/types'

const COPY: Record<PoResponseAction, { icon: typeof CheckCircle2; iconClass: string; title: string; body: string }> = {
  accept: {
    icon: CheckCircle2,
    iconClass: 'bg-green-100 text-green-500',
    title: 'Purchase order accepted',
    body: 'Thank you — the site manager has been notified that you\'ve accepted this order.',
  },
  reject: {
    icon: XCircle,
    iconClass: 'bg-red-100 text-red-500',
    title: 'Purchase order rejected',
    body: 'The site manager has been notified of your rejection and the reason provided.',
  },
  reschedule: {
    icon: CalendarClock,
    iconClass: 'bg-orange-100 text-orange-500',
    title: 'New date confirmed',
    body: 'Thank you — the purchase order has been confirmed for the new date, and the site manager has been notified.',
  },
}

export function ActionSuccessState({ variant }: { variant: PoResponseAction }) {
  const { icon: Icon, iconClass, title, body } = COPY[variant]

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${iconClass}`}>
        <Icon size={22} />
      </div>
      <h2 className="text-base font-semibold text-slate-800 mb-1.5">{title}</h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{body}</p>
    </div>
  )
}
