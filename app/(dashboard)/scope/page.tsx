'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getScopingPaginated } from '@/lib/api'
import { PageHeader } from '@/components/shared/page-header'
import { ScopeRow, ScopeTableHeader } from '@/components/cards/scope-row'
import { ScopeSlideOver } from '@/components/cards/scope-slide-over'
import { ScopeCreateModal } from '@/components/forms/scope-create-modal'
import { EmptyState } from '@/components/ui/empty-state'
import { TableRowSkeleton } from '@/components/ui/skeleton'
import { PaginationBar } from '@/components/ui/pagination-bar'
import { cn } from '@/lib/utils'
import type { ScopeData } from '@/lib/types'

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'both', label: 'Both' },
]

export default function ScopePage() {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()

  const [typeFilter, setTypeFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedScope, setSelectedScope] = useState<ScopeData | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const queryKey = ['scopes', currentPage, typeFilter]

  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      getScopingPaginated(token!, {
        page: currentPage,
        limit: 10,
      }),
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  })

  const scopes = (data?.data ?? []).filter(
    (s) => !typeFilter || s.type === typeFilter
  )
  const pagination = data?.pagination

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const handleRowClick = useCallback((scope: ScopeData) => {
    setSelectedScope(scope)
  }, [])

  const isTableLoading = isLoading || isFetching

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="Scope of Work"
        description="View and manage project scopes"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#C66EEB] hover:bg-[#A855D4] text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New Scope
          </button>
        }
      />

      {/* Type filter */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setTypeFilter(f.value)
                setCurrentPage(1)
              }}
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
      </div>

      {/* Table */}
      <div className={cn('bg-white rounded-2xl border border-slate-100 overflow-hidden flex-1', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <ScopeTableHeader />

        {isTableLoading ? (
          Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} />)
        ) : scopes.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No scopes found"
            description="Create your first scope of work to get started"
          />
        ) : (
          scopes.map((s) => (
            <ScopeRow key={s.scopeId} scope={s} onClick={handleRowClick} />
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
      {selectedScope && (
        <ScopeSlideOver
          scope={selectedScope}
          onClose={() => setSelectedScope(null)}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <ScopeCreateModal
          token={token!}
          onClose={() => setShowCreateModal(false)}
          queryKey={queryKey}
        />
      )}
    </div>
  )
}
