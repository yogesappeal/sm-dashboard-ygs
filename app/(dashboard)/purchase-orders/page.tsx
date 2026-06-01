'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getPurchaseOrdersPaginated } from '@/lib/api'
import { PageHeader } from '@/components/shared/page-header'
import { PORow, POTableHeader } from '@/components/cards/po-row'
import { EmptyState } from '@/components/ui/empty-state'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { cn } from '@/lib/utils'

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'subcontractor', label: 'Subcontractor' },
]

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'PO Draft', label: 'Draft' },
  { value: 'PO Submitted', label: 'Submitted' },
  { value: 'PO Sent', label: 'Sent' },
  { value: 'PO Rejected', label: 'Rejected' },
  { value: 'PO Cancelled', label: 'Cancelled' },
]

export default function PurchaseOrdersPage() {
  const { token } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [newPOOpen, setNewPOOpen] = useState(false)

  const queryKey = ['purchase-orders', currentPage, typeFilter, statusFilter]

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      getPurchaseOrdersPaginated(token!, {
        page: currentPage,
        limit: 10,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
      }),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  })

  const pos = data?.data ?? []
  const pagination = data?.pagination

  const handleFilterChange = useCallback((type: string, status: string) => {
    setTypeFilter(type)
    setStatusFilter(status)
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
          <div className="relative">
            <button
              onClick={() => setNewPOOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-[#C66EEB] hover:bg-[#A855D4] text-white text-sm font-medium rounded-lg transition-colors"
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
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
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

        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(typeFilter, e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
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
              description="Create a new supplier or subcontractor PO to get started"
            />
          ) : (
            pos.map((po) => <PORow key={po.id} po={po} />)
          )}
        </div>
        {pagination && pagination.totalPages > 0 && (
          <PaginationBar
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
            isRefreshing={isTableLoading}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  )
}
