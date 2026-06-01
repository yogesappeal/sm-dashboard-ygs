'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ChevronDown, Search, X } from 'lucide-react'
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

      {/* Filters + Search */}
      <div className="flex items-center gap-3 mb-4 flex-wrap justify-between">
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

        <div className="relative w-60 ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search PO..."
            className="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
              description="Create a new supplier or subcontractor PO to get started"
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
