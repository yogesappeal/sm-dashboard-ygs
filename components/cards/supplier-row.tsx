'use client'

import { Building2 } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { truncate } from '@/lib/utils'
import type { SupplierData } from '@/lib/types'

interface SupplierRowProps {
  supplier: SupplierData
  onClick: (supplier: SupplierData) => void
}

export function SupplierRow({ supplier, onClick }: SupplierRowProps) {
  return (
    <button
      onClick={() => onClick(supplier)}
      className="w-full flex items-center gap-2.5 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 text-left group"
    >
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        <Building2 size={16} className="text-[#C66EEB]" />
      </div>
      <span className="flex-[2] text-sm text-[#C66EEB] font-medium group-hover:underline truncate min-w-0">
        {truncate(supplier.supplierCode || '-', 20)}
      </span>
      <span className="flex-[4] text-sm text-slate-700 truncate">
        {supplier.name || '-'}
      </span>
      <span className="flex-[3] text-sm text-slate-500 truncate hidden md:block">
        {supplier.company || '-'}
      </span>
      <div className="flex-[2] flex">
        <StatusBadge status={supplier.type === 'supplier' ? 'supplier' : 'subcontractor'} />
      </div>
      <div className="flex-[2] flex">
        <StatusBadge status={supplier.status || 'Inactive'} />
      </div>
    </button>
  )
}

export function SupplierTableHeader() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b-2 border-slate-200 bg-slate-50/50">
      <div className="flex-shrink-0 w-5" />
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</span>
      <span className="flex-[4] text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</span>
      <span className="flex-[3] text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:block">Company</span>
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</span>
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
    </div>
  )
}
