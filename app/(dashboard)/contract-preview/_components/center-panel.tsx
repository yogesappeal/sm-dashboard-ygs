'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Send, Check, XCircle, ChevronDown, Clock, Package, Activity, CheckCircle2, AlertCircle, FileText, Loader2, Mail, Calendar, Paperclip } from 'lucide-react'
import { cn, normalizeOrderItems, scopeAllowedPoTypes, buildScopeSnapshot, buildOrderDetailsNote } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuthStore } from '@/lib/store'
import { getSuppliersPaginated, getScopeDetailByContractId, insertPurchaseOrder, getPurchaseOrderDetailsFull, respondNewDateRequest } from '@/lib/api'
import { PoAttachmentsSection, FEATURE_ATTACHMENTS } from '@/components/forms/po-attachments-section'
import { AttachmentList } from '@/components/shared/attachment-list'
import { useToast } from '@/components/shared/toast'
import type { ScopeData, InsertPurchaseOrderBody } from '@/lib/types'
import type { CanvasContext, CanvasAction } from './canvas-state'
import { useContractId } from './contract-id-context'

// ─── Activity Canvas ──────────────────────────────────────────────────────────

const ACTIVITIES = [
  { id: 1, Icon: Package, color: 'bg-blue-100 text-blue-500', label: 'PO-2026-003 created', sub: 'Plumbing Mate · Subcontractor PO · $3,200', date: '12 Feb 2026, 2:00 PM' },
  { id: 2, Icon: Send, color: 'bg-[#6692C5]/10 text-[#6692C5]', label: 'PO-2026-002 submitted to Elec Sub', sub: 'Status changed: PO Draft → PO Submitted', date: '11 Feb 2026, 11:30 AM' },
  { id: 3, Icon: Package, color: 'bg-blue-100 text-blue-500', label: 'PO-2026-001 created', sub: 'Roofing Co. · Supplier PO · $12,500', date: '10 Feb 2026, 9:00 AM' },
  { id: 4, Icon: CheckCircle2, color: 'bg-green-100 text-green-500', label: 'Scope SC-2026-00001 updated', sub: 'House · Electrical status changed to In Progress', date: '8 Feb 2026, 3:15 PM' },
  { id: 5, Icon: AlertCircle, color: 'bg-red-100 text-red-500', label: 'Plumbing flagged as Urgent', sub: 'House · Plumbing — immediate action required', date: '7 Feb 2026, 10:00 AM' },
  { id: 6, Icon: FileText, color: 'bg-slate-100 text-slate-500', label: 'Contract created', sub: "SC-2026-00001-3E3 — Lisa D'Hondt", date: '10 Jan 2026, 9:00 AM' },
]

function ActivityCanvas() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={16} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Activity</h2>
        </div>

        <div className="relative">
          <div className="absolute left-5 top-5 bottom-5 w-px bg-slate-100" />
          <div className="flex flex-col gap-1">
            {ACTIVITIES.map((a) => (
              <div key={a.id} className="flex items-start gap-4 relative group">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-white', a.color)}>
                  <a.Icon size={16} />
                </div>
                <div className="flex-1 bg-white rounded-xl border border-slate-100 px-4 py-3 mb-3 hover:border-slate-200 transition-colors">
                  <p className="text-sm font-medium text-slate-700">{a.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.sub}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Clock size={10} className="text-slate-300" />
                    <p className="text-[10px] text-slate-300">{a.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Create PO Canvas types ───────────────────────────────────────────────────

interface BuildingEntry {
  buildingId: string
  buildingName: string
  checked: boolean
  open: boolean
  notes: string
}

interface TradeSection {
  tradeId: string
  tradeName: string
  checked: boolean
  open: boolean
  buildings: BuildingEntry[]
}

// ─── Supplier Email Body (used inside modal) ──────────────────────────────────

function SupplierEmailBody({
  vendorName, deliveryDate, siteInfo, scopeData, trades, smName,
}: {
  vendorName: string
  deliveryDate: string
  siteInfo: string
  scopeData: ScopeData | undefined
  trades: TradeSection[]
  smName: string
}) {
  const formattedDate = deliveryDate
    ? new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        .format(new Date(deliveryDate + 'T00:00:00'))
    : '—'

  const siteAddress = scopeData ? [scopeData.street_address].filter(Boolean).join(', ') : ''

  const orderItems = trades.flatMap((t) =>
    t.checked ? t.buildings.filter((b) => b.checked).map((b) => ({
      title: `${t.tradeName} — ${b.buildingName}`,
      notes: b.notes,
    })) : []
  )

  return (
    <div className="space-y-4 text-[13px] leading-relaxed text-slate-700" style={{ fontFamily: 'Arial, sans-serif' }}>
      <p><strong>Hello {vendorName || <span className="text-slate-300 italic">Supplier Name</span>},</strong></p>
      <p>
        Review PO Scope &amp; Schedule for PO Number: <strong className="text-slate-400 italic">TBD</strong>.
        {deliveryDate && <> To accept the order and delivery on <strong>{formattedDate}</strong>.</>}
      </p>
      <div>
        <span>Click here → </span>
        <span className="inline-block px-4 py-1.5 rounded bg-[#5b7db1] text-white text-xs font-medium">Accept Order</span>
      </div>
      <hr className="border-slate-200" />
      <div>
        <p className="font-bold text-slate-800 mb-3">Purchase Order Details</p>
        {orderItems.length === 0 ? (
          <p className="text-slate-300 italic text-xs">No items yet — tick trades and buildings on the left</p>
        ) : (
          <div className="space-y-3">
            {orderItems.map((item, i) => (
              <div key={i} className={cn('pb-3', i < orderItems.length - 1 && 'border-b border-slate-100')}>
                <p className="font-bold text-slate-800 text-[13px] mb-0.5">{item.title}</p>
                {item.notes ? (
                  <>
                    <p className="font-semibold text-slate-500 text-xs">Description:</p>
                    <p className="text-slate-600 text-xs whitespace-pre-wrap">{item.notes}</p>
                  </>
                ) : (
                  <p className="text-slate-300 italic text-xs">No description added</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <hr className="border-slate-200" />
      <div>
        <p className="font-bold text-slate-800 mb-2">Job Site Details</p>
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td className="font-semibold text-slate-500 pr-3 py-0.5 w-32">Primary Contact</td><td className="text-slate-600 py-0.5">: {smName || '—'}</td></tr>
            <tr><td className="font-semibold text-slate-500 pr-3 py-0.5">Property Owner</td><td className="text-slate-600 py-0.5">: {scopeData?.client_full_name || <span className="text-slate-300 italic">—</span>}</td></tr>
            <tr><td className="font-semibold text-slate-500 pr-3 py-0.5">Site Address</td><td className="text-slate-600 py-0.5">: {siteAddress || <span className="text-slate-300 italic">—</span>}</td></tr>
            {siteInfo && <tr><td className="font-semibold text-slate-500 pr-3 py-0.5">Site Information</td><td className="text-slate-600 py-0.5">: {siteInfo}</td></tr>}
          </tbody>
        </table>
      </div>
      <hr className="border-slate-200" />
      <div>
        <p className="font-bold text-slate-800 mb-1">Schedule and Confirm</p>
        {deliveryDate && <p className="text-xs text-slate-600 mb-1">Confirm delivery on {formattedDate}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="px-3 py-1 rounded border border-[#5b7db1] text-[#5b7db1] text-xs">Accept</span>
          <span className="px-3 py-1 rounded border border-[#5b7db1] text-[#5b7db1] text-xs">Reschedule</span>
          <span className="px-3 py-1 rounded border border-red-400 text-red-400 text-xs">Reject</span>
        </div>
      </div>
      <hr className="border-slate-200" />
      <div>
        <p className="text-slate-600">Kind Regards,</p>
        <p className="font-bold text-slate-700">{smName || '—'} | Site Manager</p>
        <div style={{ marginTop: '10px' }}>
          <img src="https://exlknzxmmqnehvximbyj.supabase.co/storage/v1/object/public/assets/company-logos/logo_ah.png" alt="AusHail Construction" style={{ height: '50px', width: 'auto', display: 'block' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Subs Email Body (used inside modal) ─────────────────────────────────────

function SubsEmailBody({
  subsName, deliveryDate, siteInfo, scopeData, trades, jobDetails, totalPrice, smName,
}: {
  subsName: string
  deliveryDate: string
  siteInfo: string
  scopeData: ScopeData | undefined
  trades: TradeSection[]
  jobDetails: string
  totalPrice: string
  smName: string
}) {
  const formattedDate = deliveryDate
    ? new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        .format(new Date(deliveryDate + 'T00:00:00'))
    : '—'

  const siteAddress = scopeData ? [scopeData.street_address].filter(Boolean).join(', ') : ''
  const formattedPrice = totalPrice && parseFloat(totalPrice) > 0
    ? `$${parseFloat(totalPrice).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
    : null
  const checkedTrades = trades.filter((t) => t.checked)

  return (
    <div className="space-y-4 text-[13px] leading-relaxed text-slate-700" style={{ fontFamily: 'Arial, sans-serif' }}>
      <p><strong>Hello {subsName || <span className="text-slate-300 italic">Subcontractor Name</span>},</strong></p>
      <p>
        Please review the Purchase Order for PO Number: <strong className="text-slate-400 italic">TBD</strong>.
        {deliveryDate && <> Work is scheduled for <strong>{formattedDate}</strong>.</>}
      </p>
      <div>
        <span>Click here → </span>
        <span className="inline-block px-4 py-1.5 rounded bg-[#5b7db1] text-white text-xs font-medium">Accept Order</span>
      </div>
      <hr className="border-slate-200" />
      <div>
        <p className="font-bold text-slate-800 mb-2">Scope of Work</p>
        {scopeData && <p className="text-xs text-slate-500 font-mono mb-2">{scopeData.scope_name}</p>}
        {checkedTrades.length === 0 ? (
          <p className="text-slate-300 italic text-xs">No trades selected yet</p>
        ) : (
          <div className="space-y-2">
            {checkedTrades.map((trade) => {
              const checkedBuildings = trade.buildings.filter((b) => b.checked)
              return (
                <div key={trade.tradeId}>
                  <p className="text-sm font-semibold text-slate-700">{trade.tradeName}</p>
                  {checkedBuildings.length > 0
                    ? <p className="text-xs text-slate-500 mt-0.5">{checkedBuildings.map((b) => b.buildingName).join(', ')}</p>
                    : <p className="text-xs text-slate-300 italic mt-0.5">All buildings</p>
                  }
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div>
        <p className="font-bold text-slate-800 mb-1">Job Description</p>
        {jobDetails
          ? <p className="text-slate-600 text-xs whitespace-pre-wrap">{jobDetails}</p>
          : <p className="text-slate-300 italic text-xs">No description added yet</p>
        }
      </div>
      {formattedPrice && (
        <>
          <hr className="border-slate-200" />
          <div className="flex items-baseline justify-between">
            <span className="font-bold text-slate-800">Total Price</span>
            <span className="text-lg font-bold text-[#5b7db1]">{formattedPrice} AUD</span>
          </div>
        </>
      )}
      <hr className="border-slate-200" />
      <div>
        <p className="font-bold text-slate-800 mb-2">Job Site Details</p>
        <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr><td className="font-semibold text-slate-500 pr-3 py-0.5 w-32">Primary Contact</td><td className="text-slate-600 py-0.5">: {smName || '—'}</td></tr>
            <tr><td className="font-semibold text-slate-500 pr-3 py-0.5">Property Owner</td><td className="text-slate-600 py-0.5">: {scopeData?.client_full_name || <span className="text-slate-300 italic">—</span>}</td></tr>
            <tr><td className="font-semibold text-slate-500 pr-3 py-0.5">Site Address</td><td className="text-slate-600 py-0.5">: {siteAddress || <span className="text-slate-300 italic">—</span>}</td></tr>
            {siteInfo && <tr><td className="font-semibold text-slate-500 pr-3 py-0.5">Site Information</td><td className="text-slate-600 py-0.5">: {siteInfo}</td></tr>}
          </tbody>
        </table>
      </div>
      <hr className="border-slate-200" />
      <div>
        <p className="font-bold text-slate-800 mb-1">Schedule and Confirm</p>
        {deliveryDate && <p className="text-xs text-slate-600 mb-1">Confirm work date on {formattedDate}</p>}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="px-3 py-1 rounded border border-[#5b7db1] text-[#5b7db1] text-xs">Accept</span>
          <span className="px-3 py-1 rounded border border-[#5b7db1] text-[#5b7db1] text-xs">Reschedule</span>
          <span className="px-3 py-1 rounded border border-red-400 text-red-400 text-xs">Reject</span>
        </div>
      </div>
      <hr className="border-slate-200" />
      <div>
        <p className="text-slate-600">Kind Regards,</p>
        <p className="font-bold text-slate-700">{smName || '—'} | Site Manager</p>
        <div style={{ marginTop: '10px' }}>
          <img src="https://exlknzxmmqnehvximbyj.supabase.co/storage/v1/object/public/assets/company-logos/logo_ah.png" alt="AusHail Construction" style={{ height: '50px', width: 'auto', display: 'block' }} />
        </div>
      </div>
    </div>
  )
}

// ─── Scope Trade/Building selector ────────────────────────────────────────────

function ScopeSelector({
  scopeData, trades, isLoading, isError, isSupplier,
  onToggleTradeChecked, onToggleTradeOpen, onToggleBuildingChecked, onToggleBuildingOpen, onUpdateNotes,
}: {
  scopeData: ScopeData | undefined
  trades: TradeSection[]
  isLoading: boolean
  isError: boolean
  isSupplier: boolean
  onToggleTradeChecked: (tradeId: string) => void
  onToggleTradeOpen: (tradeId: string) => void
  onToggleBuildingChecked: (tradeId: string, buildingId: string) => void
  onToggleBuildingOpen: (tradeId: string, buildingId: string) => void
  onUpdateNotes: (tradeId: string, buildingId: string, notes: string) => void
}) {
  const checkedCount = trades.filter((t) => t.checked).length

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading scope...</span>
      </div>
    )
  }

  if (isError || trades.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
        <FileText size={24} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-400">No scope found for this contract</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700 truncate">{scopeData?.scope_name}</p>
          {scopeData?.scope_number && <p className="text-xs text-slate-400 font-mono mt-0.5">{scopeData.scope_number}</p>}
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-3',
          checkedCount > 0 ? 'bg-[#6692C5]/10 text-[#6692C5]' : 'bg-slate-100 text-slate-400')}>
          {checkedCount}/{trades.length} trades
        </span>
      </div>

      <div>
        {trades.map((trade) => (
          <div key={trade.tradeId} className="border-b border-slate-100 last:border-0">
            <div className={cn('flex items-center gap-3 px-4 py-3 transition-colors', trade.checked ? 'bg-[#6692C5]/5' : 'hover:bg-slate-50')}>
              <input
                type="checkbox" checked={trade.checked}
                onChange={() => onToggleTradeChecked(trade.tradeId)}
                className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer accent-[#6692C5] flex-shrink-0"
              />
              <span className={cn('text-sm font-medium flex-1', trade.checked ? 'text-slate-700' : 'text-slate-500')}>
                {trade.tradeName}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {trade.buildings.length} building{trade.buildings.length !== 1 ? 's' : ''}
              </span>
              {trade.checked && (
                <button type="button" onClick={() => onToggleTradeOpen(trade.tradeId)}
                  className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                  <ChevronDown size={14} className={cn('transition-transform', !trade.open && '-rotate-90')} />
                </button>
              )}
            </div>

            {trade.checked && trade.open && (
              <div className="border-t border-slate-100">
                {trade.buildings.map((building) => (
                  <div key={building.buildingId} className="border-b border-slate-100 last:border-0">
                    <div className={cn('flex items-center gap-3 px-8 py-2 transition-colors', building.checked ? 'bg-slate-50' : 'hover:bg-slate-50/60')}>
                      <input
                        type="checkbox" checked={building.checked}
                        onChange={() => onToggleBuildingChecked(trade.tradeId, building.buildingId)}
                        className="w-3 h-3 rounded border-slate-300 cursor-pointer accent-[#6692C5] flex-shrink-0"
                      />
                      <span className={cn('text-xs font-semibold flex-1 uppercase tracking-wide', building.checked ? 'text-slate-600' : 'text-slate-400')}>
                        {building.buildingName}
                      </span>
                      {isSupplier && building.checked && (
                        <button type="button" onClick={() => onToggleBuildingOpen(trade.tradeId, building.buildingId)}
                          className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                          <ChevronDown size={12} className={cn('transition-transform', !building.open && '-rotate-90')} />
                        </button>
                      )}
                    </div>
                    {isSupplier && building.checked && building.open && (
                      <div className="px-8 pb-3 pt-1.5">
                        <textarea
                          value={building.notes}
                          onChange={(e) => onUpdateNotes(trade.tradeId, building.buildingId, e.target.value)}
                          rows={2}
                          placeholder="Describe what you need to order for this building…"
                          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#6692C5]/40 resize-y placeholder:text-slate-300"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Email Preview Modal ──────────────────────────────────────────────────────

function EmailPreviewModal({
  type, vendorName, deliveryDate, siteInfo, scopeData, trades, jobDetails, totalPrice, smName, onClose,
}: {
  type: 'supplier' | 'subcontractor'
  vendorName: string
  deliveryDate: string
  siteInfo: string
  scopeData: ScopeData | undefined
  trades: TradeSection[]
  jobDetails: string
  totalPrice: string
  smName: string
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90%] flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">Email Preview</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {type === 'supplier' ? 'Sent to supplier on submit' : 'Sent to subcontractor on submit'}
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Email body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-[13px] leading-relaxed text-slate-700" style={{ fontFamily: 'Arial, sans-serif' }}>
          {type === 'supplier'
            ? <SupplierEmailBody vendorName={vendorName} deliveryDate={deliveryDate} siteInfo={siteInfo} scopeData={scopeData} trades={trades} smName={smName} />
            : <SubsEmailBody subsName={vendorName} deliveryDate={deliveryDate} siteInfo={siteInfo} scopeData={scopeData} trades={trades} jobDetails={jobDetails} totalPrice={totalPrice} smName={smName} />
          }
        </div>
      </div>
    </div>
  )
}

// ─── Create PO Canvas ─────────────────────────────────────────────────────────

function CreatePOCanvas({
  canvas,
  onCanvas,
}: {
  canvas: Extract<CanvasContext, { view: 'create-po' }>
  onCanvas: (a: CanvasAction) => void
}) {
  const { token, user } = useAuthStore()
  const contractId = useContractId()
  const toast = useToast()

  const [type, setType]             = useState<'supplier' | 'subcontractor'>(canvas.poType)
  const [deliveryMethod, setDeliveryMethod] = useState<'Delivery' | 'Pick Up'>('Delivery')
  const [vendorId, setVendorId]     = useState('')
  const [vendorName, setVendorName] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [siteInfo, setSiteInfo]     = useState('')
  const [jobDetails, setJobDetails] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [trades, setTrades]         = useState<TradeSection[]>([])
  const [attachmentIds, setAttachmentIds] = useState<string[]>([])
  const [attachmentsUploading, setAttachmentsUploading] = useState(false)
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [showEmailPreview, setShowEmailPreview] = useState(false)

  // Capture canvas values at mount — stable reference for the effect closure
  const initialPreSelect = useRef({ tradeName: canvas.tradeName, buildingName: canvas.buildingName })

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-dropdown', type],
    queryFn: () => getSuppliersPaginated(token!, { limit: 100, type: type === 'supplier' ? 'Supplier' : 'Subcontractor' }),
    enabled: !!token,
  })

  const { data: scopeData, isLoading: scopeLoading, isError: scopeError } = useQuery({
    queryKey: ['scope-by-contract', contractId],
    queryFn: () => getScopeDetailByContractId(token!, contractId),
    enabled: !!token,
  })

  const vendors = vendorsData?.data ?? []

  // A scope whose type is supplier-only (or subcontractor-only) can't have
  // the other kind of PO raised against it — snap back to an allowed type if
  // the scope loads (or changes) after the canvas already picked one.
  const allowedTypes = scopeData ? scopeAllowedPoTypes(scopeData.type) : ['supplier', 'subcontractor'] as const
  useEffect(() => {
    if (!scopeData) return
    if (!allowedTypes.includes(type)) setType(allowedTypes[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeData])

  // ── Parse scope + apply pre-select in one effect ───────────────────────────

  useEffect(() => {
    if (!scopeData) { setTrades([]); return }

    const tradeMap = new Map<string, { tradeId: string; tradeName: string; buildings: { buildingId: string; buildingName: string }[] }>()
    for (const building of scopeData.scope_details ?? []) {
      for (const trade of building.trades ?? []) {
        const key = trade.trade_name.trim().toLowerCase()
        if (!tradeMap.has(key)) tradeMap.set(key, { tradeId: trade.trade_id, tradeName: trade.trade_name, buildings: [] })
        tradeMap.get(key)!.buildings.push({ buildingId: building.building_id, buildingName: building.building_name })
      }
    }

    const newTrades: TradeSection[] = Array.from(tradeMap.values()).map((t) => ({
      tradeId: t.tradeId, tradeName: t.tradeName, checked: false, open: true,
      buildings: t.buildings.map((b) => ({ ...b, checked: false, open: true, notes: '' })),
    }))

    const { tradeName, buildingName } = initialPreSelect.current

    setTrades((prev) => {
      // Don't overwrite user's manual changes on background refetch
      if (prev.length > 0) return prev

      // First load — apply pre-selection if opened via trade hover
      if (tradeName) {
        return newTrades.map((t) => {
          if (t.tradeName.toLowerCase() !== tradeName.toLowerCase()) return t
          return {
            ...t, checked: true, open: true,
            buildings: t.buildings.map((b) =>
              buildingName && b.buildingName.toLowerCase() === buildingName.toLowerCase()
                ? { ...b, checked: true, open: true }
                : b
            ),
          }
        })
      }
      return newTrades
    })
  }, [scopeData])

  // ── Trade/building handlers ────────────────────────────────────────────────

  const toggleTradeChecked = useCallback((tradeId: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : { ...t, checked: !t.checked })), [])

  const toggleTradeOpen = useCallback((tradeId: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : { ...t, open: !t.open })), [])

  const toggleBuildingChecked = useCallback((tradeId: string, buildingId: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : {
      ...t,
      buildings: t.buildings.map((b) =>
        b.buildingId !== buildingId ? b : { ...b, checked: !b.checked, open: !b.checked }
      ),
    })), [])

  const toggleBuildingOpen = useCallback((tradeId: string, buildingId: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : {
      ...t,
      buildings: t.buildings.map((b) => b.buildingId !== buildingId ? b : { ...b, open: !b.open }),
    })), [])

  const updateNotes = useCallback((tradeId: string, buildingId: string, notes: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : {
      ...t,
      buildings: t.buildings.map((b) => b.buildingId !== buildingId ? b : { ...b, notes }),
    })), [])

  // ── Submit ─────────────────────────────────────────────────────────────────

  const insertMutation = useMutation({
    mutationFn: (body: InsertPurchaseOrderBody) => insertPurchaseOrder(token!, body),
    onSuccess: (res) => {
      if (res.email_error) toast(`PO created, but the email failed to send: ${res.email_error}`, 'error')
      onCanvas({ type: 'SHOW_ACTIVITY' })
    },
  })

  const isPending = insertMutation.isPending || attachmentsUploading
  const isSubmitError = insertMutation.isError
  const checkedTradeCount = trades.filter((t) => t.checked).length

  const validate = () => {
    const e: Record<string, string> = {}
    if (!vendorId)     e.vendorId     = `Select a ${type === 'supplier' ? 'supplier' : 'subcontractor'}`
    if (!deliveryDate) e.deliveryDate = 'Select a date'
    if (type === 'subcontractor' && (!totalPrice || parseFloat(totalPrice) <= 0)) e.totalPrice = 'Enter total price'
    if (checkedTradeCount === 0) e.trades = 'Select at least one trade'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (isDraft: boolean) => {
    if (!validate()) return
    if (attachmentsUploading) return
    insertMutation.mutate({
      contract_id:      contractId,
      supplier_id:      vendorId,
      delivery_method:  deliveryMethod,
      scheduled_date:   deliveryDate,
      site_information: siteInfo,
      type,
      service_type:     type,
      status:           isDraft ? 'PO Draft' : 'PO Submitted',
      po_amount:        type === 'subcontractor' ? (parseFloat(totalPrice) || 0) : 0,
      order_details:    type === 'supplier' ? buildOrderDetailsNote(trades) : { details: jobDetails },
      scope_snapshot:   buildScopeSnapshot(trades),
      attachment_ids:   attachmentIds,
      send_email:       !isDraft,
    })
  }

  const fieldCls = (k: string) =>
    cn('w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30',
      errors[k] ? 'border-red-300' : 'border-slate-200')

  const smName = user?.full_name ?? ''

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white flex-shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Create Purchase Order</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {canvas.buildingName && canvas.tradeName
              ? `${canvas.buildingName} · ${canvas.tradeName}`
              : 'Fill in details and select scope'}
          </p>
        </div>
        <button onClick={() => onCanvas({ type: 'SHOW_ACTIVITY' })}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-5 pb-24">
        <div className="space-y-4">

          {/* Type toggle — only shows types this scope allows */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
            {allowedTypes.map((t) => (
              <button key={t} onClick={() => { setType(t); setVendorId(''); setVendorName('') }}
                className={cn('px-5 py-2 text-sm font-medium rounded-lg transition-colors capitalize',
                  type === t ? 'bg-[#6692C5] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {t}
              </button>
            ))}
          </div>

          {/* Order information */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Order Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {type === 'supplier' ? 'Supplier' : 'Subcontractor'} <span className="text-red-400">*</span>
                </label>
                <select value={vendorId} onChange={(e) => {
                  setVendorId(e.target.value)
                  setVendorName(vendors.find((v) => v.id === e.target.value)?.name ?? '')
                }} className={fieldCls('vendorId')}>
                  <option value="">Select {type === 'supplier' ? 'supplier' : 'subcontractor'}...</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                {errors.vendorId && <p className="text-xs text-red-400 mt-1">{errors.vendorId}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {type === 'supplier' ? 'Delivery Date' : 'Work Date'} <span className="text-red-400">*</span>
                </label>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                  className={fieldCls('deliveryDate')} />
                {errors.deliveryDate && <p className="text-xs text-red-400 mt-1">{errors.deliveryDate}</p>}
              </div>

              {type === 'subcontractor' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Total Price (AUD) <span className="text-red-400">*</span>
                  </label>
                  <input type="number" min="0" step="0.01" value={totalPrice} placeholder="0.00"
                    onChange={(e) => setTotalPrice(e.target.value)} className={fieldCls('totalPrice')} />
                  {errors.totalPrice && <p className="text-xs text-red-400 mt-1">{errors.totalPrice}</p>}
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Delivery Method</label>
                <div className="flex items-center gap-4">
                  {(['Delivery', 'Pick Up'] as const).map((method) => (
                    <label key={method} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="deliveryMethod"
                        checked={deliveryMethod === method}
                        onChange={() => setDeliveryMethod(method)}
                        className="w-3.5 h-3.5 accent-[#6692C5] cursor-pointer"
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </div>

              <div className={type === 'subcontractor' ? '' : 'col-span-2'}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Site Information</label>
                <textarea value={siteInfo} onChange={(e) => setSiteInfo(e.target.value)} rows={2}
                  placeholder="Enter site information..."
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 resize-none" />
              </div>
            </div>
          </div>

          {/* Scope selector */}
          <div>
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-slate-700">
                {type === 'supplier' ? 'Material Order' : 'Job Scope'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {type === 'supplier'
                  ? 'Tick the trades and buildings you want to order for'
                  : 'Tick the trades and buildings this subcontractor will work on'}
              </p>
            </div>
            {errors.trades && <p className="text-xs text-red-400 mb-2">{errors.trades}</p>}
            <ScopeSelector
              scopeData={scopeData}
              trades={trades}
              isLoading={scopeLoading}
              isError={scopeError}
              isSupplier={type === 'supplier'}
              onToggleTradeChecked={toggleTradeChecked}
              onToggleTradeOpen={toggleTradeOpen}
              onToggleBuildingChecked={toggleBuildingChecked}
              onToggleBuildingOpen={toggleBuildingOpen}
              onUpdateNotes={updateNotes}
            />
          </div>

          {/* Job description (subs only) */}
          {type === 'subcontractor' && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Job Description</label>
              <textarea value={jobDetails} onChange={(e) => setJobDetails(e.target.value)} rows={4}
                placeholder="Describe the job scope, materials to be used, work requirements..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 resize-none" />
            </div>
          )}

          {FEATURE_ATTACHMENTS && (
            <PoAttachmentsSection
              attachmentIds={attachmentIds}
              onAttachmentIdsChange={setAttachmentIds}
              onUploadingChange={setAttachmentsUploading}
            />
          )}
        </div>
      </div>

      {/* Fixed footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-5 py-3.5 flex items-center gap-2 flex-shrink-0">
        <button onClick={() => setShowEmailPreview(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
          <Mail size={15} /> Preview Email
        </button>
        <div className="flex-1" />
        {isSubmitError && <p className="text-xs text-red-400">Failed to save. Try again.</p>}
        <button onClick={() => handleSubmit(true)} disabled={isPending}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
          Save as Draft
        </button>
        <button onClick={() => handleSubmit(false)} disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#6692C5] hover:bg-[#4F7CB3] text-white rounded-lg transition-colors disabled:opacity-50">
          {attachmentsUploading ? 'Uploading attachments…' : insertMutation.isPending ? 'Submitting…' : 'Submit PO'}
        </button>
      </div>

      {/* Email preview modal */}
      {showEmailPreview && (
        <EmailPreviewModal
          type={type}
          vendorName={vendorName}
          deliveryDate={deliveryDate}
          siteInfo={siteInfo}
          scopeData={scopeData}
          trades={trades}
          jobDetails={jobDetails}
          totalPrice={totalPrice}
          smName={smName}
          onClose={() => setShowEmailPreview(false)}
        />
      )}
    </div>
  )
}

// ─── PO Detail Canvas ─────────────────────────────────────────────────────────

function PODetailCanvas({
  canvas,
  onCanvas,
}: {
  canvas: Extract<CanvasContext, { view: 'po-detail' }>
  onCanvas: (a: CanvasAction) => void
}) {
  const { token } = useAuthStore()
  const contractId = useContractId()
  const queryClient = useQueryClient()
  const [showReject, setShowReject] = useState(false)
  const [rescheduleHandled, setRescheduleHandled] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'decline' | null>(null)
  const [responseMessage, setResponseMessage] = useState<string | null>(null)

  const { data: po, isLoading, isError } = useQuery({
    queryKey: ['po-detail-full', canvas.poId],
    queryFn: () => getPurchaseOrderDetailsFull(token!, canvas.poId),
    enabled: !!token && !!canvas.poId,
  })

  const respondMutation = useMutation({
    mutationFn: (action: 'approve' | 'decline') =>
      respondNewDateRequest(token!, { po_id: canvas.poId, action }),
    onSuccess: (res) => {
      setConfirmAction(null)
      setRescheduleHandled(true)
      setResponseMessage(res.message)
      queryClient.invalidateQueries({ queryKey: ['po-detail-full', canvas.poId] })
      queryClient.invalidateQueries({ queryKey: ['contract-details-full', contractId] })
    },
  })

  useEffect(() => {
    if (!responseMessage) return
    const t = setTimeout(() => setResponseMessage(null), 3500)
    return () => clearTimeout(t)
  }, [responseMessage])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-slate-400 h-full">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading PO...</span>
      </div>
    )
  }

  if (isError || !po) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-sm text-slate-400">Failed to load PO detail.</p>
      </div>
    )
  }

  const formatDate = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso + 'T00:00:00')) : '-'

  const formatDateTime = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : '-'

  const deliveryDate = formatDate(po.scheduled_date)
  const requestedDate = formatDate(po.new_requested_date)
  const orderItems = normalizeOrderItems(po.order_details)
  const showRescheduleBanner = po.status === 'PO Rescheduled' && !rescheduleHandled
  const showRescheduleHistory = !!po.reviewed_status

  return (
    <div className="flex flex-col h-full relative">
      {responseMessage && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-white text-xs font-medium shadow-lg">
          <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
          {responseMessage}
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-800">{po.po_number}</h2>
          <StatusBadge status={po.status} />
          <StatusBadge status={po.type} />
        </div>
        <div className="flex items-center gap-2">
          {po.status === 'PO Draft' && (
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#6692C5] hover:bg-[#b55fd4] text-white font-medium rounded-lg transition-colors">
              <Send size={12} /> Send PO
            </button>
          )}
          {po.status === 'PO Submitted' && (
            <>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors">
                <Check size={12} /> Accept
              </button>
              <button onClick={() => setShowReject(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 bg-red-50 hover:bg-red-100 text-red-500 font-medium rounded-lg transition-colors">
                <XCircle size={12} /> Reject
              </button>
            </>
          )}
          <button onClick={() => onCanvas({ type: 'SHOW_ACTIVITY' })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {showReject && (
        <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex-shrink-0">
          <p className="text-xs font-semibold text-red-700 mb-2">Reason for rejection</p>
          <textarea rows={2} placeholder="Explain why this PO is being rejected..."
            className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-white" />
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowReject(false)}
              className="px-4 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button className="px-4 py-1.5 text-sm bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors">Confirm Reject</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {showRescheduleBanner && (
          <div className="flex items-start gap-4 mb-4 pl-4 pr-5 py-4 rounded-xl border border-orange-100 bg-orange-50/60 border-l-4 border-l-orange-400">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Clock size={16} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-orange-800">Reschedule requested</p>
              <p className="text-xs text-orange-700/80 mt-0.5">
                {po.po_number} - {po.supplier_name} has requested reschedule to {requestedDate}.
              </p>
              {po.external_notes && (
                <p className="text-xs text-orange-700/80">Reason: {po.external_notes}</p>
              )}

              {confirmAction ? (
                <div className="mt-3 px-3 py-2.5 rounded-lg bg-white border border-orange-200">
                  <p className="text-xs font-medium text-slate-700">
                    Are you sure you want to {confirmAction === 'approve' ? 'approve' : 'decline'} this reschedule request?
                  </p>
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => setConfirmAction(null)}
                      disabled={respondMutation.isPending}
                      className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => respondMutation.mutate(confirmAction)}
                      disabled={respondMutation.isPending}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50',
                        confirmAction === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                      )}
                    >
                      {respondMutation.isPending
                        ? 'Submitting…'
                        : confirmAction === 'approve' ? 'Yes, approve' : 'Yes, decline'}
                    </button>
                  </div>
                  {respondMutation.isError && (
                    <p className="text-xs text-red-500 mt-2">Failed to submit. Try again.</p>
                  )}
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setConfirmAction('approve')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-green-300 bg-white hover:bg-green-50 text-green-600 font-medium rounded-lg transition-colors"
                  >
                    <Check size={12} /> Approve reschedule
                  </button>
                  <button
                    onClick={() => setConfirmAction('decline')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 bg-white hover:bg-red-50 text-red-500 font-medium rounded-lg transition-colors"
                  >
                    <X size={12} /> Decline
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100/70 text-orange-700 text-xs font-medium flex-shrink-0 whitespace-nowrap">
              <Calendar size={12} />
              Requested date: {requestedDate}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 content-start">
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">PO Information</p>
              </div>
              {[
                { label: 'PO Number', value: po.po_number },
                { label: 'Status', value: <StatusBadge status={po.status} /> },
                { label: 'Type', value: <StatusBadge status={po.type} /> },
                { label: 'Delivery Date', value: deliveryDate },
                ...(po.type === 'subcontractor'
                  ? [{ label: 'Total Amount', value: <span className="font-semibold text-slate-800">${po.po_amount.toLocaleString()}</span> }]
                  : []),
              ].map(row => (
                <div key={row.label} className="flex items-center px-4 py-3 border-b border-slate-50 last:border-0">
                  <p className="text-xs text-slate-400 w-36 flex-shrink-0">{row.label}</p>
                  <div className="text-sm text-slate-700">{row.value}</div>
                </div>
              ))}
            </div>

            {showRescheduleHistory && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <Clock size={12} className="text-slate-400" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Reschedule History</p>
                </div>
                {[
                  { label: 'Original Date', value: formatDate(po.original_scheduled_date) },
                  { label: 'Requested Date', value: requestedDate },
                  {
                    label: 'Review Result',
                    value: (
                      <span className={cn(
                        'font-semibold capitalize',
                        po.reviewed_status === 'approved' ? 'text-green-600' : 'text-red-500'
                      )}>
                        {po.reviewed_status}
                      </span>
                    ),
                  },
                  { label: 'Reviewed At', value: formatDateTime(po.reviewed_at) },
                  { label: 'Reason', value: po.external_notes || '-' },
                ].map(row => (
                  <div key={row.label} className="flex items-center px-4 py-3 border-b border-slate-50 last:border-0">
                    <p className="text-xs text-slate-400 w-36 flex-shrink-0">{row.label}</p>
                    <div className="text-sm text-slate-700">{row.value}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Order Details</p>
              </div>
              {orderItems.length === 0 ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-slate-400 italic">No order items</p>
                </div>
              ) : (
                <div>
                  {orderItems.map((item, i) => (
                    <div key={item.id} className={cn('px-4 py-3', i > 0 && 'border-t border-slate-50')}>
                      <p className="text-sm font-semibold text-slate-700">{item.name}</p>
                      {item.shortDescription && <p className="text-xs text-slate-400 mt-0.5">{item.shortDescription}</p>}
                      {item.description && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{item.description}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Scope</p>
              </div>
              {po.scope_snapshot.length === 0 ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-slate-400 italic">No scope selected</p>
                </div>
              ) : (
                <div>
                  {po.scope_snapshot.map((building, i) => (
                    <div key={building.building_id} className={cn('px-4 py-3', i > 0 && 'border-t border-slate-50')}>
                      <p className="text-sm font-semibold text-slate-700">{building.building_name || 'Building'}</p>
                      {building.trades.length > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {building.trades.map((t) => t.trade_name).join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {po.type === 'supplier' ? 'Supplier' : 'Subcontractor'}
                </p>
              </div>
              {[
                { label: 'Name', value: po.supplier_name },
                { label: 'Email', value: po.supplier_email },
                { label: 'Phone', value: '-' },
              ].map(row => (
                <div key={row.label} className="px-4 py-3 border-b border-slate-50 last:border-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{row.label}</p>
                  <p className="text-xs text-slate-700 font-medium break-all">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Client</p>
              </div>
              {[
                { label: 'RA Number', value: po.ra_number || '-' },
                { label: 'Name', value: [po.client_first_name, po.client_last_name].filter(Boolean).join(' ') || '-' },
                { label: 'Address', value: po.address || '-' },
              ].map(row => (
                <div key={row.label} className="px-4 py-3 border-b border-slate-50 last:border-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{row.label}</p>
                  <p className="text-xs text-slate-700 font-medium break-all">{row.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Site Information</p>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm text-slate-600">{po.site_information || '-'}</p>
              </div>
            </div>
          </div>

          {po.attachments && po.attachments.length > 0 && (
            <div className="col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Paperclip size={12} className="text-slate-400" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Attachments</p>
              </div>
              <AttachmentList attachments={po.attachments} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Center Panel ─────────────────────────────────────────────────────────────

export function CenterPanel({ canvas, onCanvas }: {
  canvas: CanvasContext
  onCanvas: (action: CanvasAction) => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {canvas.view === 'activity' && <ActivityCanvas />}
      {canvas.view === 'create-po' && <CreatePOCanvas canvas={canvas} onCanvas={onCanvas} />}
      {canvas.view === 'po-detail' && <PODetailCanvas canvas={canvas} onCanvas={onCanvas} />}
    </div>
  )
}
