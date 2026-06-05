'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import type { CanvasAction } from './canvas-state'
import type { DummyScope, DummyPO } from './types'

// ─── Scope Navigator ──────────────────────────────────────────────────────────

function tradeDot(status: string) {
  if (status === 'Urgent') return 'bg-red-400'
  if (status === 'Completed') return 'bg-green-400'
  return 'bg-yellow-400'
}

function ScopeNavigator({ scopes, onCanvas }: {
  scopes: DummyScope[]
  onCanvas: (a: CanvasAction) => void
}) {
  const [openScopes, setOpenScopes] = useState<Record<string, boolean>>({ 'sc-1': true })
  const [openBuildings, setOpenBuildings] = useState<Record<string, boolean>>({ 'b1': true, 'b2': true })

  return (
    <div className="p-3 flex flex-col gap-3">
      {scopes.map(scope => {
        const scopeOpen = openScopes[scope.scope_id] ?? false
        return (
          <div key={scope.scope_id} className="rounded-xl border border-slate-200 overflow-hidden">
            {/* Scope header row */}
            <button
              onClick={() => setOpenScopes(p => ({ ...p, [scope.scope_id]: !p[scope.scope_id] }))}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              {scopeOpen
                ? <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
                : <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{scope.scope_number}</p>
                <p className="text-[10px] text-slate-400 truncate">{scope.scope_name}</p>
              </div>
              <StatusBadge status={scope.order_status} className="flex-shrink-0" />
            </button>

            {scopeOpen && (
              <>
                {/* Supplier / Subs quick-create */}
                <div className="flex gap-2 px-3 py-2 bg-white border-t border-b border-slate-100">
                  <button
                    onClick={() => onCanvas({ type: 'SHOW_CREATE_PO', poType: 'supplier' })}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
                  >
                    <Plus size={11} /> Supplier
                  </button>
                  <button
                    onClick={() => onCanvas({ type: 'SHOW_CREATE_PO', poType: 'subcontractor' })}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#6692C5]/10 text-[#6692C5] hover:bg-[#6692C5]/20 transition-colors border border-[#6692C5]/20"
                  >
                    <Plus size={11} /> Subs
                  </button>
                </div>

                {/* Buildings → Trades tree */}
                {scope.scope_details.map(building => {
                  const bOpen = openBuildings[building.building_id] ?? true
                  return (
                    <div key={building.building_id} className="bg-white border-t border-slate-100">
                      {/* Building row */}
                      <button
                        onClick={() => setOpenBuildings(p => ({ ...p, [building.building_id]: !p[building.building_id] }))}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors"
                      >
                        {bOpen
                          ? <ChevronDown size={11} className="text-slate-300 flex-shrink-0" />
                          : <ChevronRight size={11} className="text-slate-300 flex-shrink-0" />
                        }
                        <span className="text-xs font-semibold text-slate-600">{building.building_name}</span>
                        <span className="text-[10px] text-slate-400">· building</span>
                      </button>

                      {bOpen && (
                        <div className="ml-4 border-l-2 border-slate-100 pl-3 pb-1">
                          {building.trades.map(trade => (
                            <div
                              key={trade.trade_id}
                              className="flex items-center justify-between py-2 pr-2 group border-b border-slate-50 last:border-0"
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', tradeDot(trade.status))} />
                                <span className={cn(
                                  'text-xs font-medium',
                                  trade.status === 'Urgent' ? 'text-red-500' : 'text-slate-600'
                                )}>
                                  {trade.trade_name}
                                </span>
                                <span className="text-[10px] text-slate-400">· trade</span>
                              </div>
                              <button
                                onClick={() => onCanvas({
                                  type: 'SHOW_CREATE_PO',
                                  poType: 'supplier',
                                  buildingName: building.building_name,
                                  tradeName: trade.trade_name,
                                })}
                                className="hidden group-hover:flex items-center gap-1 text-[10px] text-[#6692C5] hover:text-[#4F7CB3] font-medium whitespace-nowrap"
                              >
                                <Plus size={10} /> Create PO
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Timestamp footer */}
                <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
                  <p className="text-[10px] text-slate-400">Created 10 Jan 2026 · Updated 12 Feb 2026</p>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── PO Tracker ───────────────────────────────────────────────────────────────

const PO_STATUS_ORDER = ['PO Draft', 'PO Submitted', 'PO Sent', 'PO Completed', 'PO Rejected', 'PO Cancelled']

function POTracker({ pos, onCanvas }: {
  pos: DummyPO[]
  onCanvas: (a: CanvasAction) => void
}) {
  if (pos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <p className="text-sm text-slate-500 font-medium">No purchase orders</p>
        <p className="text-xs text-slate-400 mt-1">Create your first PO from the scope navigator</p>
      </div>
    )
  }

  const grouped = PO_STATUS_ORDER.reduce<Record<string, DummyPO[]>>((acc, status) => {
    const items = pos.filter(p => p.status === status)
    if (items.length > 0) acc[status] = items
    return acc
  }, {})

  return (
    <div className="p-3 flex flex-col gap-4">
      {Object.entries(grouped).map(([status, items]) => (
        <div key={status}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
            {status} <span className="font-normal">({items.length})</span>
          </p>
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
            {items.map((po, i) => (
              <button
                key={po.id}
                onClick={() => onCanvas({ type: 'SHOW_PO_DETAIL', poId: po.id })}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-slate-50 transition-colors',
                  i > 0 && 'border-t border-slate-100'
                )}
              >
                <div className="w-[110px] flex-shrink-0">
                  <StatusBadge status={po.type} className="mt-0.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700 truncate">{po.po_number}</p>
                  <p className="text-xs text-slate-400 truncate">{po.supplier_name}</p>
                  {po.amount != null && (
                    <p className="text-xs text-slate-600 font-medium mt-0.5">${po.amount.toLocaleString()}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

interface RightPanelProps {
  scopes: DummyScope[]
  pos: DummyPO[]
  onCanvas: (action: CanvasAction) => void
}

export function RightPanel({ scopes, pos, onCanvas }: RightPanelProps) {
  const [tab, setTab] = useState<'scope' | 'po'>('scope')

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 flex-shrink-0">
        {[{ key: 'scope', label: 'All Scope' }, { key: 'po', label: 'PO Tracker' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'scope' | 'po')}
            className={cn(
              'flex-1 py-3 text-xs font-semibold transition-colors border-b-2',
              tab === t.key
                ? 'border-[#6692C5] text-[#6692C5]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Info hint */}
      <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex-shrink-0">
        <p className="text-[10px] text-blue-600 leading-relaxed">
          {tab === 'scope'
            ? 'Click any scope to expand. Hover a trade to create a PO.'
            : 'Click a PO to view its details in the center panel.'}
        </p>
      </div>

      {/* Status legend */}
      {tab === 'scope' && (
        <div className="px-3 py-2 border-b border-slate-100 bg-white flex-shrink-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Status Legend</p>
          <div className="flex flex-col gap-1">
            {[
              { dot: 'bg-red-400', label: 'Urgent need to action' },
              { dot: 'bg-yellow-400', label: 'Waiting / in progress' },
              { dot: 'bg-green-400', label: 'Completed' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', l.dot)} />
                <span className="text-[10px] text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'scope'
          ? <ScopeNavigator scopes={scopes} onCanvas={onCanvas} />
          : <POTracker pos={pos} onCanvas={onCanvas} />
        }
      </div>
    </div>
  )
}
