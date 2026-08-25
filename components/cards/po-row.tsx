'use client'

import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import { truncate } from '@/lib/utils'
import type { POData } from '@/lib/types'

interface PORowProps {
  po: POData
}

export function PORow({ po }: PORowProps) {
  const href =
    po.type === 'supplier'
      ? `/purchase-orders/supplier/${po.id}`
      : `/purchase-orders/subcontractor/${po.id}`

  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group"
    >
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        <Building2 size={16} className="text-[#6692C5]" />
      </div>
      <span className="flex-[2] text-sm text-[#6692C5] font-medium group-hover:underline truncate min-w-0">
        {truncate(po.po_number || '-', 35)}
      </span>
      <span className="flex-[3] text-sm text-slate-700 truncate hidden md:block">
        {po.supplier_name || '-'}
      </span>
      <div className="flex-[2] flex hidden lg:flex">
        <StatusBadge status={po.type} />
      </div>
      <div className="flex-[2] flex">
        <StatusBadge status={po.status} />
      </div>
    </Link>
  )
}

export function POTableHeader() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b-2 border-slate-200 bg-slate-50/50">
      <div className="flex-shrink-0 w-5" />
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">PO Number</span>
      <span className="flex-[3] text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:block">Supplier / Subs</span>
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:block">Type</span>
      <span className="flex-[2] text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</span>
    </div>
  )
}
