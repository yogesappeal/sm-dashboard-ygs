'use client'

import { Building2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { truncate } from '@/lib/utils'
import type { SupplierData } from '@/lib/types'

export type SupplierSortField = 'name' | 'company' | 'status'
export type SupplierSortDir = 'asc' | 'desc'

interface SupplierRowProps {
  supplier: SupplierData
  onClick: (supplier: SupplierData) => void
}

interface SupplierTableHeaderProps {
  sortField?: SupplierSortField
  sortDir?: SupplierSortDir
  onSort?: (field: SupplierSortField) => void
}

function SortIcon({ field, sortField, sortDir }: { field: SupplierSortField; sortField?: SupplierSortField; sortDir?: SupplierSortDir }) {
  if (sortField !== field) return <ChevronsUpDown size={12} className="text-slate-400" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-slate-700" />
    : <ChevronDown size={12} className="text-slate-700" />
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
        {truncate(supplier.supplier_code || '-', 20)}
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

export function SupplierTableHeader({ sortField, sortDir, onSort }: SupplierTableHeaderProps) {
  const col = (label: string, field: SupplierSortField, flex: string, hidden?: string) => (
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
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</span>
      {col('Name', 'name', 'flex-[4]')}
      {col('Company', 'company', 'flex-[3]', 'hidden md:flex')}
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</span>
      {col('Status', 'status', 'flex-[2]')}
    </div>
  )
}
