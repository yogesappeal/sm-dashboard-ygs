'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, Search, X } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import {
  getDashboardMetrics,
  getOpsMetrics,
  getClientsPaginated,
  getAllClientsPaginatedForOps,
} from '@/lib/api'
import { WelcomeCard } from '@/components/cards/welcome-card'
import { MetricCard, OpsMetricCard } from '@/components/cards/metric-card'
import { ContractRow, ContractTableHeader } from '@/components/cards/contract-row'
import type { SortField, SortDir } from '@/components/cards/contract-row'
import { EmptyState } from '@/components/ui/empty-state'
import { MetricsSkeleton, TableRowSkeleton } from '@/components/ui/skeleton'
import { PaginationBar } from '@/components/ui/pagination-bar'
import type { DataContract } from '@/lib/types'

const STATUS_FILTERS = [
  { index: 1, label: 'Deposit', status: 'Deposit' },
  { index: 2, label: 'Pending', status: 'Preparation' },
  { index: 3, label: 'Active', status: 'Active' },
]

export default function DashboardPage() {
  const { token, role, user } = useAuthStore()
  const queryClient = useQueryClient()
  const isOps = role === 'Operations'
  // Admin sees the same unfiltered contract list as Ops (all-client-paginated),
  // distinct from isOps above which also drives the metrics/row variant.
  const usesAllClientsApi = role === 'Operations' || role === 'Admin'

  const [activeFilter, setActiveFilter] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isPageChanging, setIsPageChanging] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField | undefined>()
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Debounce search input before triggering the API query
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timeout)
  }, [searchInput])

  const activeStatus = STATUS_FILTERS.find((f) => f.index === activeFilter)?.status

  // Metrics query
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics', role],
    queryFn: () =>
      isOps ? getOpsMetrics(token!) : getDashboardMetrics(token!),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })

  const metrics = metricsData?.metrics ?? []

  // Contracts query
  const contractsQueryKey = ['contracts', role, currentPage, activeStatus, search]
  const { data: contractsData, isLoading: contractsLoading, isFetching } = useQuery({
    queryKey: contractsQueryKey,
    queryFn: () => {
      const params = { page: currentPage, limit: 10, status: activeStatus, search: search || undefined }
      return usesAllClientsApi
        ? getAllClientsPaginatedForOps(token!, params)
        : getClientsPaginated(token!, params)
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  })

  const rawContracts = contractsData?.data ?? []
  const pagination = contractsData?.pagination

  const contracts = useMemo(() => {
    if (!sortField) return rawContracts
    return [...rawContracts].sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rawContracts, sortField, sortDir])

  const handleFilterClick = useCallback(
    (filterIndex: number) => {
      const newIndex = activeFilter === filterIndex ? 0 : filterIndex
      setActiveFilter(newIndex)
      setCurrentPage(1)
    },
    [activeFilter]
  )

  const handlePageChange = useCallback((page: number) => {
    setIsPageChanging(true)
    setCurrentPage(page)
    setTimeout(() => setIsPageChanging(false), 300)
  }, [])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: contractsQueryKey })
  }, [queryClient, contractsQueryKey])

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return field
      }
      setSortDir('asc')
      return field
    })
  }, [])

  const handleSearch = useCallback((val: string) => {
    setSearchInput(val)
  }, [])

  const firstName = user?.first_name ?? (isOps ? 'Ops' : 'SM')
  const isContractsLoading = contractsLoading || isFetching || isPageChanging

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header — metrics, title, search, table column header. Doesn't scroll. */}
      <div className="flex-shrink-0">
        <div className="mb-6">
          {metricsLoading ? (
            <MetricsSkeleton />
          ) : isOps ? (
            <OpsMetricsRow metrics={metrics} firstName={firstName} />
          ) : (
            <SMMetricsRow
              metrics={metrics}
              firstName={firstName}
              activeFilter={activeFilter}
              onFilterClick={handleFilterClick}
            />
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-800">Contract</h2>
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search project..."
              className="w-full pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 focus:border-transparent"
            />
            {searchInput && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contract table — header and pagination stay put, only the row list scrolls */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col flex-1 overflow-hidden min-h-0">
        <ContractTableHeader sortField={sortField} sortDir={sortDir} onSort={handleSort} />

        <div className="flex-1 overflow-y-auto">
          {isContractsLoading ? (
            <TableRowSkeleton rows={8} />
          ) : contracts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Welcome to the SM Page"
              description="View, track, and manage all contracts in one place to keep everything organized and easy to access"
            />
          ) : (
            contracts.map((contract) => (
              <ContractRow key={contract.id} contract={contract} />
            ))
          )}
        </div>

        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 0) > 0 && (
          <PaginationBar
            currentPage={pagination.page}
            totalPages={pagination.totalPages ?? pagination.total_pages ?? 1}
            onPageChange={handlePageChange}
            isRefreshing={isContractsLoading}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  )
}

function SMMetricsRow({
  metrics,
  firstName,
  activeFilter,
  onFilterClick,
}: {
  metrics: { name: string; total: number }[]
  firstName: string
  activeFilter: number
  onFilterClick: (index: number) => void
}) {
  return (
    <div className="flex gap-3 h-[130px]">
      <div className="flex-[10] min-w-0">
        <WelcomeCard firstName={firstName} variant="sm" />
      </div>
      <div className="flex-[13] flex gap-3">
        <MetricCard
          label="Deposit"
          value={metrics[1]?.total ?? '-'}
          isActive={activeFilter === 1}
          onClick={() => onFilterClick(1)}
        />
        <MetricCard
          label="Pending"
          value={metrics[2]?.total ?? '-'}
          isActive={activeFilter === 2}
          onClick={() => onFilterClick(2)}
        />
        <MetricCard
          label="Active"
          value={metrics[3]?.total ?? '-'}
          isActive={activeFilter === 3}
          onClick={() => onFilterClick(3)}
        />
      </div>
    </div>
  )
}

function OpsMetricsRow({
  metrics,
  firstName,
}: {
  metrics: { name: string; total: number }[]
  firstName: string
}) {
  // Look up by name (confirmed lowercase: 'scope', 'supplier') rather than
  // array position — the API doesn't guarantee ordering.
  const getTotal = (name: string) =>
    metrics.find((m) => m.name.toLowerCase() === name)?.total ?? '-'

  return (
    <div className="flex gap-3 h-[130px]">
      <div className="flex-[5] min-w-0">
        <WelcomeCard firstName={firstName} variant="ops" />
      </div>
      <OpsMetricCard label="Scope" value={getTotal('scope')} href="/scope" />
      <OpsMetricCard label="Supplier" value={getTotal('supplier')} href="/suppliers" />
      <div className="flex-[2]" />
    </div>
  )
}
