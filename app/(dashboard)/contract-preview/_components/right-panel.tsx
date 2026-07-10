'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Plus, Loader2, FileText, Calendar, CheckSquare, X } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuthStore } from '@/lib/store'
import { getScopeDetailByContractId, updateScopeItems } from '@/lib/api'
import type { ScopeData } from '@/lib/types'
import type { CanvasAction } from './canvas-state'
import type { DummyPO } from './types'
import { useContractId } from './contract-id-context'

// ─── Scope Navigator ──────────────────────────────────────────────────────────

function tradeDot(status: string) {
  if (status === 'Urgent') return 'bg-red-400'
  if (status === 'Completed') return 'bg-green-400'
  return 'bg-yellow-400'
}

function PlannedPoDateControl({
  scopeId,
  tradeId,
  tradeName,
  value,
  contractId,
}: {
  scopeId: string
  tradeId: string
  tradeName: string
  value: string | null | undefined
  contractId: string
}) {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(value ?? '')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPending(value ?? '')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open, value])

  const mutation = useMutation({
    mutationFn: (plannedPoDate: string | null) =>
      updateScopeItems(token!, { scope_id: scopeId, trades: [{ trade_id: tradeId, planned_po_date: plannedPoDate }] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-by-contract', contractId] })
      setOpen(false)
    },
  })

  const overdue = value ? new Date(value + 'T00:00:00').getTime() < new Date().setHours(0, 0, 0, 0) : false

  return (
    <div ref={wrapperRef} className="relative flex-shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setPending(value ?? '')
          setOpen(true)
        }}
        className={cn(
          'flex items-center gap-1 text-[10px] font-medium whitespace-nowrap transition-colors',
          value ? (overdue ? 'text-red-500' : 'text-slate-500 hover:text-[#6692C5]') : 'text-slate-300 hover:text-[#6692C5]'
        )}
        title="Set planned PO date"
      >
        <Calendar size={10} />
        {value ? formatDate(value) : 'Set PO date'}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1.5 z-20 w-52 bg-white rounded-xl border border-slate-200 shadow-lg p-3"
        >
          <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1.5 truncate">Planned PO date · {tradeName}</p>
          <input
            type="date"
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30"
          />
          <div className="flex items-center justify-between gap-2 mt-3">
            <button
              onClick={() => mutation.mutate(null)}
              disabled={mutation.isPending || !value}
              className="px-2 py-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => mutation.mutate(pending)}
                disabled={mutation.isPending || !pending}
                className="px-3 py-1.5 text-xs bg-[#6692C5] hover:bg-[#5a82b3] text-white font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface PoDateDraft {
  tradeName: string
  value: string
}

function DraftReviewBar({
  scopeId,
  drafts,
  contractId,
  onRemove,
  onDiscardAll,
  onSaved,
}: {
  scopeId: string
  drafts: Map<string, PoDateDraft>
  contractId: string
  onRemove: (tradeId: string) => void
  onDiscardAll: () => void
  onSaved: () => void
}) {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(true)

  const mutation = useMutation({
    mutationFn: () =>
      updateScopeItems(token!, {
        scope_id: scopeId,
        trades: Array.from(drafts.entries()).map(([tradeId, d]) => ({
          trade_id: tradeId,
          planned_po_date: d.value || null,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-by-contract', contractId] })
      onSaved()
    },
  })

  const count = drafts.size
  if (count === 0) return null

  return (
    <div className="sticky bottom-0 z-10 rounded-xl bg-slate-800 text-white shadow-lg overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2"
      >
        <span className="text-xs font-medium">{count} change{count === 1 ? '' : 's'} pending review</span>
        {expanded
          ? <ChevronDown size={13} className="text-white/70" />
          : <ChevronRight size={13} className="text-white/70" />
        }
      </button>

      {expanded && (
        <div className="max-h-36 overflow-y-auto border-t border-white/10">
          {Array.from(drafts.entries()).map(([tradeId, d]) => (
            <div key={tradeId} className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-white/5 last:border-0">
              <span className="text-[11px] truncate">{d.tradeName}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[11px] text-white/70">{d.value ? formatDate(d.value) : 'Cleared'}</span>
                <button onClick={() => onRemove(tradeId)} className="text-white/50 hover:text-white transition-colors">
                  <X size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-white/10">
        <button
          onClick={onDiscardAll}
          disabled={mutation.isPending}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Discard all
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#6692C5] hover:bg-[#5a82b3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? 'Saving...' : `Save ${count} change${count === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}

function ScopeNavigator({ scopeData, onCanvas, contractId }: {
  scopeData: ScopeData
  onCanvas: (a: CanvasAction) => void
  contractId: string
}) {
  const [scopeOpen, setScopeOpen] = useState(true)
  const [openBuildings, setOpenBuildings] = useState<Record<string, boolean>>({})
  const [editMode, setEditMode] = useState(false)
  const [drafts, setDrafts] = useState<Map<string, PoDateDraft>>(new Map())

  function toggleEditMode() {
    setEditMode(p => !p)
    setDrafts(new Map())
  }

  function setDraft(tradeId: string, tradeName: string, value: string, original: string | null | undefined) {
    setDrafts(prev => {
      const next = new Map(prev)
      if (value === (original ?? '')) next.delete(tradeId)
      else next.set(tradeId, { tradeName, value })
      return next
    })
  }

  function removeDraft(tradeId: string) {
    setDrafts(prev => {
      const next = new Map(prev)
      next.delete(tradeId)
      return next
    })
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {/* Scope header */}
        <button
          onClick={() => setScopeOpen(p => !p)}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        >
          {scopeOpen
            ? <ChevronDown size={13} className="text-slate-400 flex-shrink-0" />
            : <ChevronRight size={13} className="text-slate-400 flex-shrink-0" />
          }
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{scopeData.scope_number}</p>
            <p className="text-[10px] text-slate-400 truncate">{scopeData.scope_name}</p>
          </div>
          <StatusBadge status={scopeData.order_status} className="flex-shrink-0" />
        </button>

        {scopeOpen && (
          <>
            {/* Quick-create buttons */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-t border-b border-slate-100">
              <div className="flex gap-2">
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
              <button
                onClick={toggleEditMode}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
                  editMode
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                )}
              >
                <CheckSquare size={11} /> {editMode ? 'Cancel' : 'Edit PO dates'}
              </button>
            </div>

            {/* Buildings → Trades tree */}
            {scopeData.scope_details.map(building => {
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
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', tradeDot(building.status))} />
                            <span className={cn(
                              'text-xs font-medium truncate',
                              building.status === 'Urgent' ? 'text-red-500' : 'text-slate-600'
                            )}>
                              {trade.trade_name}
                            </span>
                            <span className="text-[10px] text-slate-400 flex-shrink-0">· trade</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {editMode ? (
                              <input
                                type="date"
                                value={drafts.get(trade.trade_id)?.value ?? (trade.planned_po_date ?? '')}
                                onChange={(e) => setDraft(trade.trade_id, trade.trade_name, e.target.value, trade.planned_po_date)}
                                className={cn(
                                  'text-[10px] border rounded-md px-1.5 py-1 w-[112px] focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30',
                                  drafts.has(trade.trade_id)
                                    ? 'border-[#6692C5] bg-[#6692C5]/5 text-[#6692C5] font-medium'
                                    : 'border-slate-200 text-slate-500'
                                )}
                              />
                            ) : (
                              <>
                                <PlannedPoDateControl
                                  scopeId={scopeData.scope_id}
                                  tradeId={trade.trade_id}
                                  tradeName={trade.trade_name}
                                  value={trade.planned_po_date}
                                  contractId={contractId}
                                />
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
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Footer */}
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
              <p className="text-[10px] text-slate-400">{scopeData.scope_number} · {scopeData.type}</p>
            </div>
          </>
        )}
      </div>

      {editMode && (
        <DraftReviewBar
          scopeId={scopeData.scope_id}
          drafts={drafts}
          contractId={contractId}
          onRemove={removeDraft}
          onDiscardAll={() => setDrafts(new Map())}
          onSaved={toggleEditMode}
        />
      )}
    </div>
  )
}

// ─── PO Tracker ───────────────────────────────────────────────────────────────

const PO_STATUS_ORDER = ['PO Draft', 'PO Submitted', 'PO Sent', 'PO Confirmed', 'PO Rescheduled', 'PO Completed', 'PO Rejected', 'PO Cancelled']

function POTracker({ pos, onCanvas }: {
  pos: DummyPO[]
  onCanvas: (a: CanvasAction) => void
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  if (pos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
          <FileText size={20} className="text-[#6692C5]" />
        </div>
        <p className="text-sm text-slate-500 font-medium">No purchase orders</p>
        <p className="text-xs text-slate-400 mt-1">Create your first PO to get started</p>
        <button
          onClick={() => onCanvas({ type: 'SHOW_CREATE_PO', poType: 'supplier' })}
          className="flex items-center gap-1.5 mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-[#6692C5] text-white hover:bg-[#5a82b3] transition-colors"
        >
          <Plus size={14} /> Create PO
        </button>
      </div>
    )
  }

  const grouped = PO_STATUS_ORDER.reduce<Record<string, DummyPO[]>>((acc, status) => {
    const items = pos.filter(p => p.status === status)
    if (items.length > 0) acc[status] = items
    return acc
  }, {})

  return (
    <div className="p-3 flex flex-col gap-5">
      {Object.entries(grouped).map(([status, items]) => {
        const isOpen = !collapsed[status]
        return (
          <div key={status}>
            <button
              onClick={() => setCollapsed(p => ({ ...p, [status]: !p[status] }))}
              className="w-full flex items-center justify-between mb-2 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
            >
              <span>{status} <span className="font-normal">({items.length})</span></span>
              {isOpen
                ? <ChevronDown size={13} className="text-slate-400" />
                : <ChevronRight size={13} className="text-slate-400" />
              }
            </button>
            {isOpen && (
              <div className="flex flex-col gap-2.5">
                {items.map(po => (
                  <button
                    key={po.id}
                    onClick={() => onCanvas({ type: 'SHOW_PO_DETAIL', poId: po.id })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-800 truncate">{po.po_number}</p>
                      <StatusBadge status={po.status} className="flex-shrink-0" />
                    </div>

                    <div className="flex items-end justify-between gap-2 mt-2.5">
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400">
                          {po.type === 'supplier' ? 'Supplier Name' : 'Subcontractor Name'}
                        </p>
                        <p className="text-sm font-semibold text-slate-700 truncate mt-0.5">{po.supplier_name}</p>
                      </div>
                      <StatusBadge status={po.type} className="flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

interface RightPanelProps {
  pos: DummyPO[]
  onCanvas: (action: CanvasAction) => void
}

export function RightPanel({ pos, onCanvas }: RightPanelProps) {
  const { token } = useAuthStore()
  const contractId = useContractId()
  const [tab, setTab] = useState<'scope' | 'po'>('scope')

  const { data: scopeData, isLoading, isError } = useQuery({
    queryKey: ['scope-by-contract', contractId],
    queryFn: () => getScopeDetailByContractId(token!, contractId),
    enabled: !!token,
  })

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

      {/* PO Tracker header action */}
      {tab === 'po' && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-white flex-shrink-0">
          <p className="text-xs font-semibold text-slate-600">PO List</p>
          <button
            onClick={() => onCanvas({ type: 'SHOW_CREATE_PO', poType: 'supplier' })}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#6692C5] text-white hover:bg-[#5a82b3] transition-colors"
          >
            <Plus size={12} /> New PO
          </button>
        </div>
      )}

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
        {tab === 'scope' && (
          <>
            {isLoading && (
              <div className="flex items-center justify-center gap-2 p-8 text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Loading scope...</span>
              </div>
            )}
            {isError && (
              <div className="p-6 text-center">
                <p className="text-xs text-slate-400">Failed to load scope</p>
              </div>
            )}
            {scopeData && (
              <ScopeNavigator scopeData={scopeData} onCanvas={onCanvas} contractId={contractId} />
            )}
          </>
        )}
        {tab === 'po' && <POTracker pos={pos} onCanvas={onCanvas} />}
      </div>
    </div>
  )
}
