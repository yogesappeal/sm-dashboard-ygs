'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Plus, Loader2, FileText, Calendar, X, AlertTriangle } from 'lucide-react'
import { cn, formatDate, scopeAllowedPoTypes } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import { PermissionGuard } from '@/components/shared/permission-guard'
import { useAuthStore } from '@/lib/store'
import { getScopeDetailByContractId, updateScopeItems, ApiError } from '@/lib/api'
import type { ScopeData } from '@/lib/types'
import type { CanvasAction } from './canvas-state'
import type { PurchaseOrder } from './types'
import { useContractId } from './contract-id-context'

// ─── Scope Navigator ──────────────────────────────────────────────────────────

// Maps a trade's po_status to the Status Legend colors. 'Not Started' (or
// unknown) gets no dot — matches the legend, which only has 3 entries.
function tradeDot(poStatus: string | null | undefined) {
  switch (poStatus) {
    case 'Urgent': return 'bg-red-400'
    case 'In Progress': return 'bg-yellow-400'
    case 'Completed': return 'bg-green-400'
    default: return null
  }
}

// Scope-level rollup from its trades' po_status: all Completed → Completed;
// any In Progress or Urgent → In Progress; otherwise (all Not Started) →
// Not Started. Urgent counts toward In Progress since it means there's
// already work needing attention, not that nothing has happened yet.
function computeScopeStatus(scopeData: ScopeData): string {
  const statuses = scopeData.scope_details.flatMap(b => b.trades.map(t => t.po_status))
  if (statuses.length === 0) return 'Not Started'
  if (statuses.every(s => s === 'Completed')) return 'Completed'
  if (statuses.some(s => s === 'In Progress' || s === 'Urgent')) return 'In Progress'
  return 'Not Started'
}

// The backend may return a full ISO timestamp for planned_po_date instead of
// a plain YYYY-MM-DD — normalize before using as a <input type="date"> value
// or before appending 'T00:00:00' for parsing.
function toDateOnly(iso: string) {
  return iso.slice(0, 10)
}

function PlannedPoDateControl({
  scopeId,
  tradeId,
  tradeName,
  value,
  contractId,
  plannedStart,
}: {
  scopeId: string
  tradeId: string
  tradeName: string
  value: string | null | undefined
  contractId: string
  plannedStart?: string
}) {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const normalizedValue = value ? toDateOnly(value) : value
  const minDate = plannedStart ? toDateOnly(plannedStart) : undefined
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(normalizedValue ?? '')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPending(normalizedValue ?? '')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open, normalizedValue])

  const mutation = useMutation({
    mutationFn: (plannedPoDate: string | null) =>
      updateScopeItems(token!, { scope_id: scopeId, trades: [{ trade_id: tradeId, planned_po_date: plannedPoDate }] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-by-contract', contractId] })
      setOpen(false)
    },
  })

  const overdue = normalizedValue ? new Date(normalizedValue + 'T00:00:00').getTime() < new Date().setHours(0, 0, 0, 0) : false
  const belowMin = !!(minDate && pending && pending < minDate)

  return (
    <div ref={wrapperRef} className="relative flex-shrink-0">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setPending(normalizedValue ?? '')
          setOpen(true)
        }}
        className={cn(
          'flex items-center gap-1 text-[10px] font-medium whitespace-nowrap transition-colors',
          value ? (overdue ? 'text-red-500' : 'text-slate-500 hover:text-[#6692C5]') : 'text-slate-300 hover:text-[#6692C5]'
        )}
        title="Set planned PO date"
      >
        <Calendar size={10} />
        {value ? formatDate(value) : 'Choose date'}
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
            min={minDate}
            onChange={(e) => setPending(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30"
          />
          {belowMin && (
            <p className="text-xs text-red-500 mt-2">
              Can&apos;t be before planned start ({formatDate(minDate!)}).
            </p>
          )}
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
                disabled={mutation.isPending || !pending || belowMin}
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
  plannedStart,
  onRemove,
  onDiscardAll,
  onSaved,
}: {
  scopeId: string
  drafts: Map<string, PoDateDraft>
  contractId: string
  plannedStart?: string
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

  const minDate = plannedStart ? toDateOnly(plannedStart) : undefined
  const invalidCount = minDate
    ? Array.from(drafts.values()).filter(d => d.value && d.value < minDate).length
    : 0

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
          {Array.from(drafts.entries()).map(([tradeId, d]) => {
            const invalid = !!(minDate && d.value && d.value < minDate)
            return (
              <div key={tradeId} className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-white/5 last:border-0">
                <span className="text-[11px] truncate">{d.tradeName}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={cn('text-[11px]', invalid ? 'text-red-300 font-medium' : 'text-white/70')}>
                    {d.value ? formatDate(d.value) : 'Cleared'}
                  </span>
                  <button onClick={() => onRemove(tradeId)} className="text-white/50 hover:text-white transition-colors">
                    <X size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {invalidCount > 0 && (
        <p className="px-3 py-2 text-[11px] text-red-300 border-t border-white/10">
          {invalidCount} date{invalidCount === 1 ? '' : 's'} {invalidCount === 1 ? 'is' : 'are'} before planned start ({formatDate(minDate!)}) — fix before saving.
        </p>
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
          disabled={mutation.isPending || invalidCount > 0}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#6692C5] hover:bg-[#5a82b3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? 'Saving...' : `Save ${count} change${count === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}

interface PlannedStartConflict {
  tradeId: string
  tradeName: string
  plannedPoDate: string
}

// Shown below the scope info when the contract's planned start date has moved
// past a trade's planned PO date. We deliberately don't auto-shift trade dates
// here — the user reviews and fixes each one themselves via PlannedPoDateControl.
function PlannedStartConflictBanner({
  plannedStart,
  conflicts,
  scopeId,
  contractId,
}: {
  plannedStart: string
  conflicts: PlannedStartConflict[]
  scopeId: string
  contractId: string
}) {
  if (conflicts.length === 0) return null

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-red-700">
            Planned start ({formatDate(plannedStart)}) is past {conflicts.length} trade PO date{conflicts.length === 1 ? '' : 's'}
          </p>
          <p className="text-[11px] text-red-600 mt-0.5">
            Modify or reset the affected trade dates below.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 mt-2.5">
        {conflicts.map(c => (
          <div key={c.tradeId} className="flex items-center justify-between gap-2 bg-white rounded-lg border border-red-100 px-2.5 py-1.5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">{c.tradeName}</p>
              <p className="text-[10px] text-red-500">Due {formatDate(c.plannedPoDate)}</p>
            </div>
            <PlannedPoDateControl
              scopeId={scopeId}
              tradeId={c.tradeId}
              tradeName={c.tradeName}
              value={c.plannedPoDate}
              contractId={contractId}
              plannedStart={plannedStart}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function ScopeNavigator({ scopeData, onCanvas, contractId, plannedStart }: {
  scopeData: ScopeData
  onCanvas: (a: CanvasAction) => void
  contractId: string
  plannedStart?: string
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

  const conflicts: PlannedStartConflict[] = plannedStart
    ? scopeData.scope_details
        .flatMap(b => b.trades)
        .filter((t): t is typeof t & { planned_po_date: string } => !!t.planned_po_date)
        .filter(t => toDateOnly(plannedStart) > toDateOnly(t.planned_po_date))
        .map(t => ({ tradeId: t.trade_id, tradeName: t.trade_name, plannedPoDate: t.planned_po_date }))
    : []

  const allowedPoTypes = scopeAllowedPoTypes(scopeData.type)
  // Single-type scope — the inline per-trade "Create PO" button has no type
  // picker of its own, so it always creates whichever type the scope allows.
  const inlinePoType = allowedPoTypes[0]

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
          <StatusBadge status={computeScopeStatus(scopeData)} className="flex-shrink-0" />
        </button>

        {scopeOpen && (
          <>
            {/* Quick-create buttons */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-t border-b border-slate-100">
              <PermissionGuard action="po:create">
                <button
                  onClick={() => onCanvas({ type: 'SHOW_CREATE_PO', poType: inlinePoType })}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-[#6692C5]/10 text-[#6692C5] hover:bg-[#6692C5]/20 transition-colors border border-[#6692C5]/20"
                >
                  <Plus size={11} /> Create PO
                </button>
              </PermissionGuard>
              <button
                onClick={toggleEditMode}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors',
                  editMode
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                )}
              >
                <Calendar size={11} /> {editMode ? 'Cancel' : 'PO Plan Date'}
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
                      {building.trades.map(trade => {
                        const minDate = plannedStart ? toDateOnly(plannedStart) : undefined
                        const draftValue = drafts.get(trade.trade_id)?.value ?? (trade.planned_po_date ? toDateOnly(trade.planned_po_date) : '')
                        const draftInvalid = !!(minDate && draftValue && draftValue < minDate)
                        return (
                        <div
                          key={trade.trade_id}
                          className="flex items-center justify-between py-2 pr-2 group border-b border-slate-50 last:border-0"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {tradeDot(trade.po_status) && (
                              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', tradeDot(trade.po_status))} />
                            )}
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
                              <div className={cn('relative w-[112px] rounded-md', !draftValue && 'focus-within:ring-2 focus-within:ring-[#6692C5]/30')}>
                                {!draftValue && (
                                  <div
                                    className={cn(
                                      'absolute inset-0 flex items-center justify-between rounded-md border px-1.5 py-1 pointer-events-none',
                                      draftInvalid ? 'border-red-400 bg-red-50' : 'border-slate-200'
                                    )}
                                  >
                                    <span className="text-[10px] text-slate-400">Choose date</span>
                                    <Calendar size={10} className="text-slate-400 flex-shrink-0" />
                                  </div>
                                )}
                                <input
                                  type="date"
                                  value={draftValue}
                                  min={minDate}
                                  onChange={(e) => setDraft(trade.trade_id, trade.trade_name, e.target.value, trade.planned_po_date ? toDateOnly(trade.planned_po_date) : null)}
                                  className={cn(
                                    'w-full text-[10px] border rounded-md px-1.5 py-1 focus:outline-none',
                                    !draftValue
                                      ? 'opacity-0'
                                      : cn(
                                          'focus:ring-2 focus:ring-[#6692C5]/30',
                                          draftInvalid
                                            ? 'border-red-400 bg-red-50 text-red-600 font-medium'
                                            : drafts.has(trade.trade_id)
                                              ? 'border-[#6692C5] bg-[#6692C5]/5 text-[#6692C5] font-medium'
                                              : 'border-slate-200 text-slate-500'
                                        )
                                  )}
                                />
                              </div>
                            ) : (
                              <>
                                {trade.planned_po_date && (
                                  <span
                                    className={cn(
                                      'flex items-center gap-1 text-[10px] font-medium whitespace-nowrap',
                                      new Date(toDateOnly(trade.planned_po_date) + 'T00:00:00').getTime() < new Date().setHours(0, 0, 0, 0)
                                        ? 'text-red-500'
                                        : 'text-slate-400'
                                    )}
                                  >
                                    <Calendar size={10} />
                                    {formatDate(trade.planned_po_date)}
                                  </span>
                                )}
                                {/* Per-trade Create PO temporarily hidden — creation now goes through the single scope-level button above */}
                              </>
                            )}
                          </div>
                        </div>
                        )
                      })}
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

      {plannedStart && (
        <PlannedStartConflictBanner
          plannedStart={plannedStart}
          conflicts={conflicts}
          scopeId={scopeData.scope_id}
          contractId={contractId}
        />
      )}

      {editMode && (
        <DraftReviewBar
          scopeId={scopeData.scope_id}
          drafts={drafts}
          contractId={contractId}
          plannedStart={plannedStart}
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
  pos: PurchaseOrder[]
  onCanvas: (a: CanvasAction) => void
}) {
  const [statusFilter, setStatusFilter] = useState('')

  if (pos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
          <FileText size={20} className="text-[#6692C5]" />
        </div>
        <p className="text-sm text-slate-500 font-medium">No purchase orders</p>
        <p className="text-xs text-slate-400 mt-1">Create your first PO to get started</p>
        <PermissionGuard action="po:create">
          <button
            onClick={() => onCanvas({ type: 'SHOW_CREATE_PO', poType: 'supplier' })}
            className="flex items-center gap-1.5 mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-[#6692C5] text-white hover:bg-[#5a82b3] transition-colors"
          >
            <Plus size={14} /> Create PO
          </button>
        </PermissionGuard>
      </div>
    )
  }

  const availableStatuses = PO_STATUS_ORDER.filter(status => pos.some(p => p.status === status))
  const filteredPos = (statusFilter ? pos.filter(p => p.status === statusFilter) : pos)
    .slice()
    .sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Fixed filter header — stays put while the list below scrolls */}
      <div className="p-3 pb-0 flex-shrink-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Status</p>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30"
        >
          <option value="">All Status ({pos.length})</option>
          {availableStatuses.map(status => (
            <option key={status} value={status}>
              {status} ({pos.filter(p => p.status === status).length})
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredPos.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No purchase orders with this status</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredPos.map(po => (
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
    </div>
  )
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

interface RightPanelProps {
  pos: PurchaseOrder[]
  onCanvas: (action: CanvasAction) => void
  plannedStart?: string
}

export function RightPanel({ pos, onCanvas, plannedStart }: RightPanelProps) {
  const { token } = useAuthStore()
  const contractId = useContractId()
  const [tab, setTab] = useState<'scope' | 'po'>('scope')

  const { data: scopeData, isLoading, isError, error: scopeError } = useQuery({
    queryKey: ['scope-by-contract', contractId],
    queryFn: () => getScopeDetailByContractId(token!, contractId),
    enabled: !!token,
    retry: (failureCount, error) => error instanceof ApiError && error.status === 404 ? false : failureCount < 3,
  })
  const scopeNotFound = scopeError instanceof ApiError && scopeError.status === 404

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
          <PermissionGuard action="po:create">
            <button
              onClick={() => onCanvas({ type: 'SHOW_CREATE_PO', poType: 'supplier' })}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#6692C5] text-white hover:bg-[#5a82b3] transition-colors"
            >
              <Plus size={12} /> Create PO
            </button>
          </PermissionGuard>
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
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'scope' && (
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 p-8 text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs">Loading scope...</span>
              </div>
            )}
            {isError && (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <FileText size={20} className="text-slate-400" />
                </div>
                {scopeNotFound ? (
                  <>
                    <p className="text-sm text-slate-500 font-medium">No scope found</p>
                    <p className="text-xs text-slate-400 mt-1">This project doesn&apos;t have a scope yet.</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 font-medium">Failed to load scope</p>
                )}
              </div>
            )}
            {scopeData && (
              <ScopeNavigator scopeData={scopeData} onCanvas={onCanvas} contractId={contractId} plannedStart={plannedStart} />
            )}
          </div>
        )}
        {tab === 'po' && <POTracker pos={pos} onCanvas={onCanvas} />}
      </div>
    </div>
  )
}
