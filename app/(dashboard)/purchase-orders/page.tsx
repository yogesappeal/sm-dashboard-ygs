'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ChevronDown, Search, X } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getPurchaseOrdersPaginated, getPurchaseOrderStatusSummary } from '@/lib/api'
import { PageHeader } from '@/components/shared/page-header'
import { PermissionGuard } from '@/components/shared/permission-guard'
import { PORow, POTableHeader } from '@/components/cards/po-row'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { TableRowSkeleton, Skeleton } from '@/components/ui/skeleton'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { cn } from '@/lib/utils'

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'subcontractor', label: 'Subcontractor' },
]

// Every status StatusBadge knows how to render (components/ui/status-badge.tsx)
// — the filter dropdown covers all of them; the summary tiles below only
// show the subset worth a glance at (SUMMARY_STATUSES).
const PO_STATUSES = [
  'PO Draft',
  'PO Submitted',
  'PO Sent',
  'PO Confirmed',
  'PO Rescheduled',
  'PO Completed',
  'PO Rejected',
  'PO Cancelled',
]

const SUMMARY_STATUSES = [
  'PO Confirmed',
  'PO Rescheduled',
  'PO Completed',
  'PO Rejected',
]

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  ...PO_STATUSES.map((status) => ({ value: status, label: status.replace('PO ', '') })),
]

export default function PurchaseOrdersPage() {
  const { token } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [newPOOpen, setNewPOOpen] = useState(false)

  const queryKey = ['purchase-orders', currentPage, typeFilter, statusFilter, search]

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      getPurchaseOrdersPaginated(token!, {
        page: currentPage,
        limit: 10,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      }),
    enabled: !!token,
    staleTime: 0,
  })

  const { data: statusSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['purchase-orders-status-summary'],
    queryFn: () => getPurchaseOrderStatusSummary(token!),
    enabled: !!token,
  })

  const pos = data?.data ?? []
  const pagination = data?.pagination

  const handleFilterChange = useCallback((type: string, status: string) => {
    setTypeFilter(type)
    setStatusFilter(status)
    setCurrentPage(1)
  }, [])

  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    setCurrentPage(1)
  }, [])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const isTableLoading = isLoading || isFetching

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Purchase Order"
        description="View and manage all purchase orders"
        action={
          <PermissionGuard action="po:create">
            <div className="relative">
              <button
                onClick={() => setNewPOOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-[#6692C5] hover:bg-[#4F7CB3] text-white text-sm font-medium rounded-lg transition-colors"
              >
                + New PO
                <ChevronDown size={14} className={cn('transition-transform', newPOOpen && 'rotate-180')} />
              </button>
              {newPOOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNewPOOpen(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden">
                    <button
                      onClick={() => { router.push('/purchase-orders/supplier/new'); setNewPOOpen(false) }}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Supplier PO
                    </button>
                    <button
                      onClick={() => { router.push('/purchase-orders/subcontractor/new'); setNewPOOpen(false) }}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Subcontractor PO
                    </button>
                  </div>
                </>
              )}
            </div>
          </PermissionGuard>
        }
      />

      {/* Status summary */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {isSummaryLoading ? (
          Array.from({ length: SUMMARY_STATUSES.length }).map((_, i) => (
            <Skeleton key={i} className="h-[68px] w-28 rounded-xl flex-shrink-0" />
          ))
        ) : (
          SUMMARY_STATUSES.map((status) => (
            <PoStatusTile
              key={status}
              status={status}
              count={statusSummary?.[status] ?? 0}
              isActive={statusFilter === status}
              onClick={() => handleFilterChange(typeFilter, statusFilter === status ? '' : status)}
            />
          ))
        )}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Type filter */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value, statusFilter)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                typeFilter === f.value
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(typeFilter, e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative w-60 ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search PO..."
            className="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]/50"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col flex-1 overflow-hidden">
        <POTableHeader />
        <div className="flex-1 overflow-y-auto">
          {isTableLoading ? (
            <TableRowSkeleton rows={8} />
          ) : pos.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No purchase orders"
              description={search ? `No results for "${search}"` : 'Create a new supplier or subcontractor PO to get started'}
            />
          ) : (
            pos.map((po) => <PORow key={po.id} po={po} />)
          )}
        </div>
        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 0) > 0 && (
          <PaginationBar
            currentPage={pagination.page}
            totalPages={pagination.totalPages ?? pagination.total_pages ?? 1}
            onPageChange={setCurrentPage}
            isRefreshing={isTableLoading}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  )
}

function PoStatusTile({ status, count, isActive, onClick }: {
  status: string
  count: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-shrink-0 flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors',
        isActive ? 'bg-[#6692C5]/10 border-[#6692C5]/40' : 'bg-white border-slate-200 hover:border-slate-300'
      )}
    >
      <StatusBadge status={status} />
      <p className="text-xl font-bold text-slate-800 leading-none">{count}</p>
    </button>
  )
}
