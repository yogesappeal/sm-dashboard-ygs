interface StatusBadgeProps {
  status: string
  className?: string
  size?: 'sm' | 'xs'
}

type StatusConfig = {
  bg: string
  text: string
  dot: string
  label: string
}

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'Deposit':
      return { bg: 'bg-yellow-50', text: 'text-yellow-600', dot: 'bg-yellow-400', label: 'Deposit' }
    case 'Preparation':
      return { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500', label: 'Pending' }
    case 'Active':
    case 'Building':
      return { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400', label: status }
    case 'Completed':
      return { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500', label: 'Completed' }
    case 'In Progress':
      return { bg: 'bg-yellow-50', text: 'text-yellow-600', dot: 'bg-yellow-400', label: 'In Progress' }
    case 'Not Started':
      return { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Not Started' }
    case 'Lost':
      return { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', label: 'Lost' }
    case 'Active Supplier':
      return { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500', label: 'Active' }
    case 'Inactive':
      return { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Inactive' }
    // PO statuses
    case 'PO Draft':
      return { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: 'PO Draft' }
    case 'PO Submitted':
      return { bg: 'bg-cyan-50', text: 'text-cyan-600', dot: 'bg-cyan-500', label: 'PO Submitted' }
    case 'PO Sent':
      return { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500', label: 'PO Sent' }
    case 'PO Confirmed':
      return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400', label: 'PO Confirmed' }
    case 'PO Rescheduled':
      return { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400', label: 'PO Rescheduled' }
    case 'PO Completed':
      return { bg: 'bg-teal-50', text: 'text-teal-600', dot: 'bg-teal-500', label: 'PO Completed' }
    case 'PO Rejected':
      return { bg: 'bg-red-50', text: 'text-red-500', dot: 'bg-red-400', label: 'PO Rejected' }
    case 'PO Cancelled':
      return { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'PO Cancelled' }
    // Bills statuses
    case 'Pending Approval':
      return { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400', label: 'Pending Approval' }
    case 'Approved':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' }
    case 'Rejected':
      return { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500', label: 'Rejected' }
    // PO type
    case 'supplier':
      return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400', label: 'Supplier' }
    case 'subcontractor':
      return { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500', label: 'Subcontractor' }
    default:
      return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400', label: status }
  }
}

export function StatusBadge({ status, className = '', size = 'sm' }: StatusBadgeProps) {
  const cfg = getStatusConfig(status)
  const sizeClasses = size === 'xs' ? 'gap-1 px-2 py-0.5 text-[11px]' : 'gap-1.5 px-2.5 py-1 text-xs'
  const dotSize = size === 'xs' ? 'w-1 h-1' : 'w-1.5 h-1.5'
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full font-medium ${sizeClasses} ${cfg.bg} ${cfg.text} ${className}`}
    >
      <span className={`rounded-full ${dotSize} ${cfg.dot} flex-shrink-0`} />
      {cfg.label}
    </span>
  )
}
