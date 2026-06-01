'use client'

import { ClipboardList } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { truncate } from '@/lib/utils'
import type { ScopeData } from '@/lib/types'

interface ScopeRowProps {
  scope: ScopeData
  onClick: (scope: ScopeData) => void
}

export function ScopeRow({ scope, onClick }: ScopeRowProps) {
  return (
    <button
      onClick={() => onClick(scope)}
      className="w-full flex items-center gap-2.5 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 text-left group"
    >
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        <ClipboardList size={16} className="text-[#C66EEB]" />
      </div>
      <span className="flex-[2] text-sm text-[#C66EEB] font-medium group-hover:underline truncate min-w-0">
        {truncate(scope.scopeNumber || '-', 20)}
      </span>
      <span className="flex-[3] text-sm text-slate-700 truncate">
        {scope.scopeName || '-'}
      </span>
      <span className="flex-[4] text-sm text-slate-500 truncate hidden md:block">
        {scope.clientRaNumber ? `${scope.clientRaNumber} — ${scope.clientFullName || ''}` : scope.clientFullName || '-'}
      </span>
      <div className="flex-[2] flex">
        <StatusBadge status={scope.type === 'supplier' ? 'supplier' : 'subcontractor'} />
      </div>
      <div className="flex-[2] flex">
        <StatusBadge status={scope.orderStatus || 'Inactive'} />
      </div>
    </button>
  )
}

export function ScopeTableHeader() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b-2 border-slate-200 bg-slate-50/50">
      <div className="flex-shrink-0 w-5" />
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">Number</span>
      <span className="flex-[3] text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</span>
      <span className="flex-[4] text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:block">Contract</span>
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</span>
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
    </div>
  )
}
