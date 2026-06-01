'use client'

import { RefreshCw, Loader2 } from 'lucide-react'

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  isRefreshing?: boolean
  onRefresh?: () => void
}

export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  isRefreshing = false,
  onRefresh,
}: PaginationBarProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-white">
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            <span>{isRefreshing ? 'Loading records...' : 'Refresh data'}</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">
          Page {currentPage} of {totalPages || 1}
        </span>
        <select
          value={currentPage}
          onChange={(e) => onPageChange(Number(e.target.value))}
          disabled={isRefreshing}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#C66EEB]/30 disabled:opacity-50 cursor-pointer"
        >
          {pages.map((p) => (
            <option key={p} value={p}>
              Page {p}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
