'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Users, X } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getSuppliersPaginated } from '@/lib/api'
import { PageHeader } from '@/components/shared/page-header'
import { PermissionGuard } from '@/components/shared/permission-guard'
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

// '' = semua, 'true' = active, 'false' = inactive
const ACTIVE_FILTERS = [
  { value: '',      label: 'All Status' },
  { value: 'true',  label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

export default function SuppliersPage() {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()

  const [typeFilter, setTypeFilter]     = useState('')
  const [activeFilter, setActiveFilter] = useState('')   // '', 'true', 'false'
  const [currentPage, setCurrentPage]   = useState(1)
  const [search, setSearch]             = useState('')
  const [searchInput, setSearchInput]   = useState('')
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc')
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierData | null>(null)
  const [showCreateModal, setShowCreateModal]   = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // convert string filter to boolean | null for the API
  const isActive =
    activeFilter === 'true'  ? true  :
    activeFilter === 'false' ? false :
    null

  const queryKey = ['suppliers', currentPage, typeFilter, activeFilter, search, sortDir]

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      getSuppliersPaginated(token!, {
        page: currentPage,
        limit: 10,
        type: typeFilter || undefined,
        is_active: isActive,
        search: search || undefined,
        order_dir: sortDir,
      }),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  })

  const suppliers  = data?.data ?? []
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

  const handleTypeChange = useCallback((type: string) => {
    setTypeFilter(type)
    setCurrentPage(1)
  }, [])

  const handleActiveChange = useCallback((active: string) => {
    setActiveFilter(active)
    setCurrentPage(1)
  }, [])

  // Backend only supports order_dir (no per-column sort), so any column click just toggles direction
  const handleSort = useCallback(() => {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
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
          <PermissionGuard action="supplier:create">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#6692C5] hover:bg-[#4F7CB3] text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Add Supplier
            </button>
          </PermissionGuard>
        }
      />

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, code, company…"
            className="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-[#6692C5]"
          />
          {searchInput && (
            <button onClick={handleClearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleTypeChange(f.value)}
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

        {/* Active/Inactive filter */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {ACTIVE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleActiveChange(f.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                activeFilter === f.value
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
      <div className={cn('bg-white rounded-2xl border border-slate-100 overflow-hidden flex-1 flex flex-col', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <SupplierTableHeader sortDir={sortDir} onSort={handleSort} />

        <div className="flex-1">
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
            totalPages={pagination.totalPages ?? pagination.total_pages ?? 1}
            onPageChange={setCurrentPage}
            onRefresh={handleRefresh}
          />
        )}
      </div>

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
