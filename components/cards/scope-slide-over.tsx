'use client'

import { X, ClipboardList, FileText, Layers } from 'lucide-react'
import { StatusBadge } from '@/components/ui/status-badge'
import type { ScopeData } from '@/lib/types'

interface ScopeSlideOverProps {
  scope: ScopeData | null
  onClose: () => void
}

export function ScopeSlideOver({ scope, onClose }: ScopeSlideOverProps) {
  if (!scope) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-[437px] bg-white border-l border-slate-200 shadow-xl flex flex-col rounded-tl-[50px]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-400">Scope Number</p>
            <p className="font-medium text-slate-800 truncate">{scope.scope_number || '-'}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={scope.type} />
            <StatusBadge status={scope.order_status || 'Inactive'} />
          </div>

          {/* Scope info */}
          <InfoRow icon={<ClipboardList size={15} />} label="Scope Name" value={scope.scope_name} />
          <InfoRow
            icon={<FileText size={15} />}
            label="Contract"
            value={scope.client_ra_number ? `${scope.client_ra_number} — ${scope.client_full_name}` : scope.client_full_name}
          />
          {scope.street_address && (
            <InfoRow icon={<FileText size={15} />} label="Address" value={scope.street_address} />
          )}
          {scope.builder && (
            <InfoRow icon={<FileText size={15} />} label="Builder" value={scope.builder} />
          )}
          {scope.notes && (
            <InfoRow icon={<FileText size={15} />} label="Notes" value={scope.notes} multiline />
          )}

          {/* Scope Items */}
          {scope.scope_details && scope.scope_details.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Layers size={15} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Scope Items ({scope.scope_details.length})
                </p>
              </div>
              <div className="space-y-2">
                {scope.scope_details.map((item, idx) => (
                  <div
                    key={item.building_id || idx}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-slate-700">{item.building_name || '-'}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.trades.length > 0 && (
                      <p className="text-xs text-slate-400">{item.trades.map(t => t.trade_name).join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function InfoRow({
  icon,
  label,
  value,
  multiline,
}: {
  icon: React.ReactNode
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-5 pt-0.5 text-slate-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <p className={`text-sm text-slate-700 ${multiline ? '' : 'truncate'}`}>{value || '-'}</p>
      </div>
    </div>
  )
}
