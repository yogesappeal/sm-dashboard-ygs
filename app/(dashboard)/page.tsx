'use client'

import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
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
import { EmptyState } from '@/components/ui/empty-state'
import { MetricsSkeleton, TableRowSkeleton } from '@/components/ui/skeleton'
import { PaginationBar } from '@/components/ui/pagination-bar'

const STATUS_FILTERS = [
  { index: 1, label: 'Deposit', status: 'Deposit' },
  { index: 2, label: 'Pending', status: 'Preparation' },
  { index: 3, label: 'Active', status: 'Active' },
]

export default function DashboardPage() {
  const { token, role, user } = useAuthStore()
  const queryClient = useQueryClient()
  const isOps = role === 'Operations'

  const [activeFilter, setActiveFilter] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isPageChanging, setIsPageChanging] = useState(false)

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
  const contractsQueryKey = ['contracts', role, currentPage, activeStatus]
  const { data: contractsData, isLoading: contractsLoading, isFetching } = useQuery({
    queryKey: contractsQueryKey,
    queryFn: () => {
      const params = { page: currentPage, limit: 10, status: activeStatus }
      return isOps
        ? getAllClientsPaginatedForOps(token!, params)
        : getClientsPaginated(token!, params)
    },
    enabled: !!token,
    staleTime: 2 * 60 * 1000,
  })

  const contracts = contractsData?.data ?? []
  const pagination = contractsData?.pagination

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

  const firstName = user?.firstName ?? (isOps ? 'Ops' : 'SM')
  const isContractsLoading = contractsLoading || isFetching || isPageChanging

  return (
    <div className="flex flex-col min-h-full">
      {/* Metrics row */}
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

      {/* Contract table */}
      <div className="flex flex-col flex-1">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Contract</h2>

        <div className="bg-white rounded-xl border border-slate-200 flex flex-col flex-1 overflow-hidden">
          <ContractTableHeader />

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

          {pagination && pagination.totalPages > 0 && (
            <PaginationBar
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              isRefreshing={isContractsLoading}
              onRefresh={handleRefresh}
            />
          )}
        </div>
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
  return (
    <div className="flex gap-3 h-[130px]">
      <div className="flex-[5] min-w-0">
        <WelcomeCard firstName={firstName} variant="ops" />
      </div>
      <OpsMetricCard label="Scope" value={metrics[0]?.total ?? '-'} href="/scope" />
      <OpsMetricCard label="Supplier" value={metrics[1]?.total ?? '-'} href="/suppliers" />
      <div className="flex-[2]" />
    </div>
  )
}
