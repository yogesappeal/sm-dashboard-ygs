'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Users, X } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getSuppliersPaginated } from '@/lib/api'
import { PageHeader } from '@/components/shared/page-header'
import { SupplierRow, SupplierTableHeader } from '@/components/cards/supplier-row'
import { SupplierSlideOver } from '@/components/cards/supplier-slide-over'
import { SupplierCreateModal } from '@/components/forms/supplier-create-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { cn } from '@/lib/utils'
import type { SupplierData } from '@/lib/types'

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'subcontractor', label: 'Subcontractor' },
]

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'Active Supplier', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
]

export default function SuppliersPage() {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()

  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const queryKey = ['suppliers', currentPage, typeFilter, statusFilter, search]

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      getSuppliersPaginated(token!, {
        page: currentPage,
        limit: 10,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
      }),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  })

  const suppliers = data?.data ?? []
  const pagination = data?.pagination

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setCurrentPage(1)
    }, 400)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchInput('')
    setSearch('')
    setCurrentPage(1)
  }, [])

  const handleFilterChange = useCallback((type: string, status: string) => {
    setTypeFilter(type)
    setStatusFilter(status)
    setCurrentPage(1)
  }, [])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const handleRowClick = useCallback((supplier: SupplierData) => {
    setSelectedSupplier(supplier)
  }, [])

  const isTableLoading = isLoading || isFetching

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Suppliers"
        description="Manage suppliers and subcontractors"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C66EEB] hover:bg-[#A855D4] text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add Supplier
          </button>
        }
      />

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, code, company…"
            className="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#C66EEB]/30 focus:border-[#C66EEB]"
          />
          {searchInput && (
            <button onClick={handleClearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
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
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(typeFilter, f.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                statusFilter === f.value
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={cn('bg-white rounded-2xl border border-slate-100 overflow-hidden flex-1', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <SupplierTableHeader />

        {isTableLoading ? (
          Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} />)
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No suppliers found"
            description={search ? `No results for "${search}"` : 'Add your first supplier to get started'}
          />
        ) : (
          suppliers.map((s) => (
            <SupplierRow key={s.id} supplier={s} onClick={handleRowClick} />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <PaginationBar
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          onPageChange={setCurrentPage}
          onRefresh={handleRefresh}
        />
      )}

      {/* Slide-over */}
      {selectedSupplier && (
        <SupplierSlideOver
          supplier={selectedSupplier}
          token={token!}
          onClose={() => setSelectedSupplier(null)}
          queryKey={queryKey}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <SupplierCreateModal
          token={token!}
          onClose={() => setShowCreateModal(false)}
          queryKey={queryKey}
        />
      )}
    </div>
  )
}
