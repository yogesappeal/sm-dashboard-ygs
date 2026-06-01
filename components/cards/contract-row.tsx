'use client'

import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate, formatCurrency, truncate } from '@/lib/utils'
import type { DataContract } from '@/lib/types'

interface ContractRowProps {
  contract: DataContract
}

export function ContractRow({ contract }: ContractRowProps) {
  return (
    <Link
      href={`/contract/${contract.id}`}
      className="flex items-center gap-2.5 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group"
    >
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        <Building2 size={16} className="text-[#C66EEB]" />
      </div>
      <span className="flex-[11] text-sm text-[#C66EEB] font-medium group-hover:underline truncate min-w-0">
        {contract.clientFullName || '-'}
      </span>
      <span className="flex-[3] text-sm text-slate-600 hidden md:block">
        {formatDate(contract.createdAt)}
      </span>
      <span className="flex-[2] text-sm text-slate-700 font-medium">
        {formatCurrency(contract.contractValue)}
      </span>
      <span className="flex-[3] text-sm text-slate-600 truncate hidden lg:block">
        {truncate(contract.suburb || '', 20)}
      </span>
      <div className="flex-[2] flex justify-start">
        <StatusBadge status={contract.status} />
      </div>
    </Link>
  )
}

export function ContractTableHeader() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b-2 border-slate-200 bg-slate-50/50">
      <div className="flex-shrink-0 w-5" />
      <span className="flex-[11] text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Project Name
      </span>
      <span className="flex-[3] text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:block">
        Deposit Date
      </span>
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Contract Value
      </span>
      <span className="flex-[3] text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:block">
        Suburb
      </span>
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Status
      </span>
    </div>
  )
}
