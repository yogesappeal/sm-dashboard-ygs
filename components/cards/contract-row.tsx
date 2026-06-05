'use client'

import Link from 'next/link'
import { Building2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate, formatCurrency, truncate } from '@/lib/utils'
import type { DataContract } from '@/lib/types'

export type SortField = 'project_name' | 'deposit_date' | 'total_contract_value' | 'suburb' | 'project_status'
export type SortDir = 'asc' | 'desc'

interface ContractRowProps {
  contract: DataContract
}

interface ContractTableHeaderProps {
  sortField?: SortField
  sortDir?: SortDir
  onSort?: (field: SortField) => void
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField?: SortField; sortDir?: SortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={12} className="text-slate-400" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-slate-700" />
    : <ChevronDown size={12} className="text-slate-700" />
}

export function ContractRow({ contract }: ContractRowProps) {
  return (
    <Link
      href={`/contract/${contract.id}`}
      className="flex items-center gap-2.5 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group"
    >
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        <Building2 size={16} className="text-[#6692C5]" />
      </div>
      <span className="flex-[10] text-sm text-[#6692C5] font-medium group-hover:underline truncate min-w-0">
        {contract.project_name || '-'}
      </span>
      <span className="flex-[3] text-sm text-slate-600 hidden md:block">
        {formatDate(contract.deposit_date)}
      </span>
      <span className="flex-[3] text-sm text-slate-700 font-medium whitespace-nowrap">
        {formatCurrency(contract.total_contract_value)}
      </span>
      <span className="flex-[3] text-sm text-slate-600 truncate hidden lg:block">
        {truncate(contract.suburb || '', 20)}
      </span>
      <div className="flex-[2] flex justify-start">
        <StatusBadge status={contract.project_status} />
      </div>
    </Link>
  )
}

export function ContractTableHeader({ sortField, sortDir, onSort }: ContractTableHeaderProps) {
  const col = (label: string, field: SortField, flex: string, hidden?: string) => (
    <button
      onClick={() => onSort?.(field)}
      className={`${flex} flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-700 transition-colors ${hidden ?? ''}`}
    >
      {label}
      <SortIcon field={field} sortField={sortField} sortDir={sortDir} />
    </button>
  )

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b-2 border-slate-200 bg-slate-50/50">
      <div className="flex-shrink-0 w-5" />
      {col('Project Name', 'project_name', 'flex-[10]')}
      {col('Deposit Date', 'deposit_date', 'flex-[3]', 'hidden md:flex')}
      {col('Contract Value', 'total_contract_value', 'flex-[3]')}
      {col('Suburb', 'suburb', 'flex-[3]', 'hidden lg:flex')}
      {col('Status', 'project_status', 'flex-[2]')}
    </div>
  )
}
