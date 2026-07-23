import { Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'

interface LinkInvalidStateProps {
  variant: 'expired' | 'used' | 'invalid'
  respondedStatus?: string
}

const COPY: Record<LinkInvalidStateProps['variant'], { icon: typeof Clock; iconClass: string; title: string; body: string }> = {
  expired: {
    icon: Clock,
    iconClass: 'bg-amber-100 text-amber-500',
    title: 'This link has expired',
    body: 'The link in this email is no longer valid. Please contact the site manager for an updated purchase order.',
  },
  used: {
    icon: CheckCircle2,
    iconClass: 'bg-green-100 text-green-500',
    title: 'This link has already been used',
    body: 'A response has already been submitted for this purchase order. If you believe this is a mistake, please contact the site manager.',
  },
  invalid: {
    icon: AlertCircle,
    iconClass: 'bg-red-100 text-red-500',
    title: 'This link is not valid',
    body: 'We couldn\'t verify this link. Please make sure you\'re using the exact link from the email, or contact the site manager.',
  },
}

export function LinkInvalidState({ variant, respondedStatus }: LinkInvalidStateProps) {
  const { icon: Icon, iconClass, title, body } = COPY[variant]

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${iconClass}`}>
        <Icon size={22} />
      </div>
      <h2 className="text-base font-semibold text-slate-800 mb-1.5">{title}</h2>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{body}</p>
      {respondedStatus && (
        <div className="mt-4 flex justify-center">
          <StatusBadge status={respondedStatus} />
        </div>
      )}
    </div>
  )
}
