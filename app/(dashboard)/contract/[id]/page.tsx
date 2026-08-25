'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  Building2,
  User,
  DollarSign,
  FileText,
  Users,
  ShoppingCart,
  ClipboardList,
  CalendarDays,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getContractDetails, getCrewPerProject, getPurchaseOrdersPaginated, getScopingPaginated } from '@/lib/api'
import { StatusBadge } from '@/components/ui/status-badge'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { token } = useAuthStore()
  const router = useRouter()

  const { data: detail, isLoading } = useQuery({
    queryKey: ['contract-detail', id],
    queryFn: () => getContractDetails(token!, id),
    enabled: !!token && !!id,
  })

  const contract = detail

  const { data: crewData, isLoading: crewLoading } = useQuery({
    queryKey: ['crew', id],
    queryFn: () => getCrewPerProject(token!, id),
    enabled: !!token && !!id,
  })

  const { data: poData, isLoading: poLoading } = useQuery({
    queryKey: ['pos-by-contract', id],
    queryFn: () => getPurchaseOrdersPaginated(token!, { contractId: id, limit: 5 }),
    enabled: !!token && !!id,
  })

  const { data: scopeData, isLoading: scopeLoading } = useQuery({
    queryKey: ['scopes-by-contract', id],
    queryFn: () => getScopingPaginated(token!, { contractId: id, limit: 5 }),
    enabled: !!token && !!id,
  })

  const crew = crewData ?? []
  const pos = poData?.data ?? []
  const scopes = scopeData?.data ?? []

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" style={{ width: `${60 + i * 5}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Contract not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-[#6692C5] hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const fullAddress = [contract.streetAddress, contract.suburb, contract.state].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col gap-5">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-800">{contract.raNumber || 'Contract Detail'}</h1>
            {contract.status && <StatusBadge status={contract.status} />}
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{contract.clientFullName}</p>
        </div>
      </div>

      {/* Contract Info Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Contract Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoField icon={<FileText size={15} />} label="PIF" value={contract.pif || '-'} />
          <InfoField icon={<User size={15} />} label="Client" value={contract.clientFullName || '-'} />
          <InfoField icon={<Building2 size={15} />} label="Builder" value={contract.builder || '-'} />
          <InfoField
            icon={<DollarSign size={15} />}
            label="Contract Value"
            value={contract.contractValue ? formatCurrency(contract.contractValue) : '-'}
          />
          {fullAddress && (
            <InfoField icon={<MapPin size={15} />} label="Location" value={fullAddress} className="md:col-span-2" />
          )}
          {contract.notes && (
            <InfoField icon={<FileText size={15} />} label="Notes" value={contract.notes} className="md:col-span-2" multiline />
          )}
          <InfoField icon={<CalendarDays size={15} />} label="Created" value={contract.createdAt ? formatDate(contract.createdAt) : '-'} />
          {contract.updatedAt && (
            <InfoField icon={<CalendarDays size={15} />} label="Updated" value={formatDate(contract.updatedAt)} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Crew */}
        <Section
          icon={<Users size={16} />}
          title="Project Crew"
          isLoading={crewLoading}
          isEmpty={crew.length === 0}
          emptyText="No crew assigned to this project"
        >
          {crew.map((member) => (
            <div key={member.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
              <div className="w-7 h-7 rounded-full bg-[#6692C5]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-[#6692C5]">
                  {member.name?.charAt(0)?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{member.name}</p>
                <p className="text-xs text-slate-400">{member.role || '-'}</p>
              </div>
            </div>
          ))}
        </Section>

        {/* Related Scopes */}
        <Section
          icon={<ClipboardList size={16} />}
          title="Related Scopes"
          isLoading={scopeLoading}
          isEmpty={scopes.length === 0}
          emptyText="No scopes for this contract"
        >
          {scopes.map((s) => (
            <div key={s.scope_id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{s.scope_name || s.scope_number}</p>
                <p className="text-xs text-slate-400">{s.scope_number}</p>
              </div>
              <StatusBadge status={s.order_status || 'Inactive'} />
            </div>
          ))}
        </Section>
      </div>

      {/* Related POs */}
      <Section
        icon={<ShoppingCart size={16} />}
        title="Purchase Orders"
        isLoading={poLoading}
        isEmpty={pos.length === 0}
        emptyText="No purchase orders for this contract"
        viewAllHref="/purchase-orders"
      >
        {pos.map((po) => (
          <Link
            key={po.id}
            href={`/purchase-orders/${po.type}/${po.id}`}
            className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 -mx-6 px-6 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ShoppingCart size={14} className="text-[#6692C5] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate group-hover:underline">{po.po_number}</p>
                <p className="text-xs text-slate-400">{po.supplier_name || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={po.type} />
              <StatusBadge status={po.status} />
            </div>
          </Link>
        ))}
      </Section>
    </div>
  )
}

function InfoField({
  icon,
  label,
  value,
  className,
  multiline,
}: {
  icon: React.ReactNode
  label: string
  value: string
  className?: string
  multiline?: boolean
}) {
  return (
    <div className={`flex gap-3 ${className ?? ''}`}>
      <div className="flex-shrink-0 w-5 pt-0.5 text-slate-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <p className={`text-sm text-slate-700 font-medium ${multiline ? '' : 'truncate'}`}>{value}</p>
      </div>
    </div>
  )
}

function Section({
  icon,
  title,
  isLoading,
  isEmpty,
  emptyText,
  viewAllHref,
  children,
}: {
  icon: React.ReactNode
  title: string
  isLoading: boolean
  isEmpty: boolean
  emptyText: string
  viewAllHref?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">{icon}</span>
          <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-xs text-[#6692C5] hover:underline">
            View all
          </Link>
        )}
      </div>
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)
      ) : isEmpty ? (
        <p className="text-xs text-slate-400 text-center py-6">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  )
}
