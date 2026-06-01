interface StatusBadgeProps {
  status: string
  className?: string
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
    case 'Lost':
      return { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', label: 'Lost' }
    case 'Active Supplier':
      return { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500', label: 'Active' }
    case 'Inactive':
      return { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Inactive' }
    // PO statuses
    case 'PO Sent':
      return { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-500', label: 'PO Sent' }
    case 'PO Draft':
      return { bg: 'bg-yellow-50', text: 'text-yellow-600', dot: 'bg-yellow-400', label: 'PO Draft' }
    case 'PO Rejected':
    case 'PO Cancelled':
      return { bg: 'bg-red-50', text: 'text-red-500', dot: 'bg-red-400', label: status }
    case 'PO Submitted':
      return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400', label: 'PO Submitted' }
    // PO type
    case 'supplier':
      return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400', label: 'Supplier' }
    case 'subcontractor':
      return { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500', label: 'Subcontractor' }
    default:
      return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400', label: status }
  }
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const cfg = getStatusConfig(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
