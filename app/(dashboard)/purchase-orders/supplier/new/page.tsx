'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, PackagePlus, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { getDropdownContractScope, getSuppliersPaginated, getScopeDetailByContractId, insertPurchaseOrder } from '@/lib/api'
import { cn, buildScopeSnapshot, buildOrderDetailsNote } from '@/lib/utils'
import { PoAttachmentsSection, FEATURE_ATTACHMENTS } from '@/components/forms/po-attachments-section'
import { useToast } from '@/components/shared/toast'
import type { InsertPurchaseOrderBody } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

// TODO: replace notes with structured rows (qty, unit, unit_rate) when ready
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

interface ScopeSection {
  scopeId: string
  scopeName: string
  scopeNumber: string
  open: boolean
  trades: TradeSection[]
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function POSupplierFormPage() {
  return <Suspense><POSupplierFormInner /></Suspense>
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function POSupplierFormInner() {
  const { token, user } = useAuthStore()
  const router          = useRouter()
  const editId          = useSearchParams().get('edit')
  const toast            = useToast()

  const [contractId, setContractId]     = useState('')
  const [supplierId, setSupplierId]     = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'Delivery' | 'Pick Up'>('Delivery')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [siteInfo, setSiteInfo]         = useState('')
  const [scopes, setScopes]             = useState<ScopeSection[]>([])
  const [attachmentIds, setAttachmentIds] = useState<string[]>([])
  const [attachmentsUploading, setAttachmentsUploading] = useState(false)
  const [errors, setErrors]             = useState<Record<string, string>>({})

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-dropdown-scope'],
    queryFn: () => getDropdownContractScope(token!),
    enabled: !!token,
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-dropdown'],
    queryFn: () => getSuppliersPaginated(token!, { limit: 100, type: 'Supplier' }),
    enabled: !!token,
  })

  const { data: scopeData, isLoading: scopeLoading, isError: scopeError } = useQuery({
    queryKey: ['scope-by-contract', contractId],
    queryFn: () => getScopeDetailByContractId(token!, contractId),
    enabled: !!token && !!contractId,
  })

  const contracts       = contractsData ?? []
  const contractsWithScope    = contracts.filter((c) => c.has_scope)
  const contractsWithoutScope = contracts.filter((c) => !c.has_scope)
  const suppliers       = suppliersData?.data ?? []
  const selectedContract = contracts.find((c) => c.id === contractId)
  const siteAddress     = selectedContract?.street_address ?? ''

  // Auto-populate material order when scope loads
  useEffect(() => {
    if (!scopeData) {
      setScopes([])
      return
    }

    // Invert building→trade into trade→building, dedup by trade_name
    const tradeMap = new Map<string, {
      tradeId: string
      tradeName: string
      buildings: { buildingId: string; buildingName: string }[]
    }>()

    for (const building of scopeData.scope_details ?? []) {
      for (const trade of building.trades ?? []) {
        const key = trade.trade_name.trim().toLowerCase()
        if (!tradeMap.has(key)) {
          tradeMap.set(key, { tradeId: trade.trade_id, tradeName: trade.trade_name, buildings: [] })
        }
        tradeMap.get(key)!.buildings.push({
          buildingId:   building.building_id,
          buildingName: building.building_name,
        })
      }
    }

    const trades: TradeSection[] = Array.from(tradeMap.values()).map((t) => ({
      tradeId:   t.tradeId,
      tradeName: t.tradeName,
      checked:   false,
      open:      true,
      buildings: t.buildings.map((b) => ({
        buildingId:   b.buildingId,
        buildingName: b.buildingName,
        checked:      false,
        open:         true,
        notes:        '',
      })),
    }))

    setScopes([{
      scopeId:     scopeData.scope_id,
      scopeName:   scopeData.scope_name,
      scopeNumber: scopeData.scope_number,
      open:        true,
      trades: trades.length > 0 ? trades : [{
        tradeId:   'general',
        tradeName: 'General',
        checked:   false,
        open:      true,
        buildings: [{ buildingId: 'general', buildingName: 'General', checked: false, open: true, notes: '' }],
      }],
    }])
  }, [scopeData])

  // ── Submit ────────────────────────────────────────────────────────────────

  const insertMutation = useMutation({
    mutationFn: (body: InsertPurchaseOrderBody) => insertPurchaseOrder(token!, body),
    onSuccess: (res) => {
      if (res.email_error) toast(`PO created, but the email failed to send: ${res.email_error}`, 'error')
      router.push('/purchase-orders')
    },
  })

  // ── Trade handlers ────────────────────────────────────────────────────────

  const toggleTradeChecked = useCallback((scopeId: string, tradeId: string) =>
    setScopes((prev) => prev.map((s) => s.scopeId !== scopeId ? s : {
      ...s,
      trades: s.trades.map((t) => t.tradeId !== tradeId ? t : { ...t, checked: !t.checked }),
    })), [])

  const toggleTradeOpen = useCallback((scopeId: string, tradeId: string) =>
    setScopes((prev) => prev.map((s) => s.scopeId !== scopeId ? s : {
      ...s,
      trades: s.trades.map((t) => t.tradeId !== tradeId ? t : { ...t, open: !t.open }),
    })), [])

  // ── Building handlers ─────────────────────────────────────────────────────

  const toggleBuildingChecked = useCallback((scopeId: string, tradeId: string, buildingId: string) =>
    setScopes((prev) => prev.map((s) => s.scopeId !== scopeId ? s : {
      ...s,
      trades: s.trades.map((t) => t.tradeId !== tradeId ? t : {
        ...t,
        buildings: t.buildings.map((b) =>
          b.buildingId !== buildingId ? b : { ...b, checked: !b.checked, open: !b.checked }
        ),
      }),
    })), [])

  const toggleBuildingOpen = useCallback((scopeId: string, tradeId: string, buildingId: string) =>
    setScopes((prev) => prev.map((s) => s.scopeId !== scopeId ? s : {
      ...s,
      trades: s.trades.map((t) => t.tradeId !== tradeId ? t : {
        ...t,
        buildings: t.buildings.map((b) =>
          b.buildingId !== buildingId ? b : { ...b, open: !b.open }
        ),
      }),
    })), [])

  const updateNotes = useCallback((scopeId: string, tradeId: string, buildingId: string, notes: string) =>
    setScopes((prev) => prev.map((s) => s.scopeId !== scopeId ? s : {
      ...s,
      trades: s.trades.map((t) => t.tradeId !== tradeId ? t : {
        ...t,
        buildings: t.buildings.map((b) =>
          b.buildingId !== buildingId ? b : { ...b, notes }
        ),
      }),
    })), [])

  // ── Derived ───────────────────────────────────────────────────────────────

  const checkedCount = scopes.flatMap((s) => s.trades.filter((t) => t.checked)).length
  const dateLabel = deliveryMethod === 'Delivery' ? 'Delivery Date' : 'Pick Up Date'

  // ── Validate + submit ─────────────────────────────────────────────────────

  const validate = () => {
    const e: Record<string, string> = {}
    if (!contractId)   e.contractId   = 'Select a contract'
    if (!supplierId)   e.supplierId   = 'Select a supplier'
    if (!deliveryDate) e.deliveryDate = `Select ${dateLabel.toLowerCase()}`
    if (scopes.length === 0)     e.scopes = 'No scope found for this contract'
    else if (checkedCount === 0) e.scopes = 'Select at least one trade to order'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (isDraft: boolean) => {
    if (!validate()) return
    if (attachmentsUploading) return
    const allTrades = scopes.flatMap((s) => s.trades)
    insertMutation.mutate({
      contract_id:      contractId,
      supplier_id:      supplierId,
      delivery_method:  deliveryMethod,
      scheduled_date:   deliveryDate,
      site_information: siteInfo,
      type:             'supplier',
      service_type:     'supplier',
      status:           isDraft ? 'PO Draft' : 'PO Submitted',
      po_amount:        0,
      order_details:    buildOrderDetailsNote(allTrades),
      scope_snapshot:   buildScopeSnapshot(allTrades),
      attachment_ids:   attachmentIds,
      send_email:       !isDraft,
    })
  }

  const fieldCls = (k: string) =>
    cn('w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30',
      errors[k] ? 'border-red-300' : 'border-slate-200')

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">
          {editId ? 'Edit Supplier PO' : 'New Supplier PO'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left col ── */}
        <div className="lg:col-span-2 space-y-4">

          <FormCard title="Order Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Contract <span className="text-red-400">*</span>
                </label>
                <select value={contractId}
                  onChange={(e) => { setContractId(e.target.value); setScopes([]) }}
                  className={fieldCls('contractId')}>
                  <option value="">Select contract...</option>
                  {contractsWithScope.length > 0 && (
                    <optgroup label="Has Scope">
                      {contractsWithScope.map((c) => <option key={c.id} value={c.id}>{c.dropdown_label}</option>)}
                    </optgroup>
                  )}
                  {contractsWithoutScope.length > 0 && (
                    <optgroup label="No Scope Yet">
                      {contractsWithoutScope.map((c) => (
                        <option key={c.id} value={c.id} disabled>{c.dropdown_label} — no scope</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {errors.contractId && <p className="text-xs text-red-400 mt-1">{errors.contractId}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Supplier <span className="text-red-400">*</span>
                </label>
                <select value={supplierId} onChange={(e) => {
                  setSupplierId(e.target.value)
                  setSupplierName(suppliers.find((s) => s.id === e.target.value)?.name ?? '')
                }} className={fieldCls('supplierId')}>
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.supplierId && <p className="text-xs text-red-400 mt-1">{errors.supplierId}</p>}
              </div>
            </div>

            <div className="mt-4">
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

            <div className="mt-4 sm:w-1/2 sm:pr-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {dateLabel} <span className="text-red-400">*</span>
              </label>
              <input type="date" value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className={fieldCls('deliveryDate')} />
              {errors.deliveryDate && <p className="text-xs text-red-400 mt-1">{errors.deliveryDate}</p>}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Site Information</label>
              <textarea value={siteInfo} onChange={(e) => setSiteInfo(e.target.value)} rows={2}
                placeholder="Enter site information..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 resize-none" />
            </div>
          </FormCard>

          {/* Material order */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Material Order</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tick the trades and buildings you want to order for</p>
            </div>

            {errors.scopes && <p className="text-xs text-red-400">{errors.scopes}</p>}

            {/* States */}
            {!contractId && (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <PackagePlus size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Select a contract above to load scope</p>
              </div>
            )}

            {contractId && scopeLoading && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading scope...</span>
              </div>
            )}

            {contractId && !scopeLoading && scopeError && (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <PackagePlus size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No scope found for this contract</p>
              </div>
            )}

            {scopes.map((scope) => (
              <ScopeBlock
                key={scope.scopeId}
                scope={scope}
                onToggleTradeChecked={toggleTradeChecked}
                onToggleTradeOpen={toggleTradeOpen}
                onToggleBuildingChecked={toggleBuildingChecked}
                onToggleBuildingOpen={toggleBuildingOpen}
                onUpdateNotes={updateNotes}
              />
            ))}
          </div>

          {FEATURE_ATTACHMENTS && (
            <PoAttachmentsSection
              attachmentIds={attachmentIds}
              onAttachmentIdsChange={setAttachmentIds}
              onUploadingChange={setAttachmentsUploading}
            />
          )}
        </div>

        {/* ── Right col ── */}
        <div className="space-y-3">
          <EmailPreview
            supplierName={supplierName}
            deliveryMethod={deliveryMethod}
            deliveryDate={deliveryDate}
            siteInfo={siteInfo}
            siteAddress={siteAddress}
            scopeData={scopeData}
            scopes={scopes}
            smName={user?.full_name ?? ''}
          />

          <div className="space-y-2">
            <button onClick={() => handleSubmit(false)} disabled={insertMutation.isPending || attachmentsUploading}
              className="w-full py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {attachmentsUploading ? 'Uploading attachments...' : insertMutation.isPending ? 'Submitting...' : 'Submit PO'}
            </button>
            <button onClick={() => handleSubmit(true)} disabled={insertMutation.isPending || attachmentsUploading}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              Save as Draft
            </button>
          </div>

          {insertMutation.isError && (
            <p className="text-xs text-red-400 text-center">Failed to save. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Scope block ──────────────────────────────────────────────────────────────

function ScopeBlock({
  scope,
  onToggleTradeChecked, onToggleTradeOpen,
  onToggleBuildingChecked, onToggleBuildingOpen, onUpdateNotes,
}: {
  scope: ScopeSection
  onToggleTradeChecked: (scopeId: string, tradeId: string) => void
  onToggleTradeOpen: (scopeId: string, tradeId: string) => void
  onToggleBuildingChecked: (scopeId: string, tradeId: string, buildingId: string) => void
  onToggleBuildingOpen: (scopeId: string, tradeId: string, buildingId: string) => void
  onUpdateNotes: (scopeId: string, tradeId: string, buildingId: string, notes: string) => void
}) {
  const checkedCount = scope.trades.filter((t) => t.checked).length

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Scope header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-sm font-semibold text-slate-700 flex-1 truncate">{scope.scopeName}</span>
        {scope.scopeNumber && (
          <span className="text-xs text-slate-400 font-mono flex-shrink-0">{scope.scopeNumber}</span>
        )}
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
          checkedCount > 0 ? 'bg-[#6692C5]/10 text-[#6692C5]' : 'bg-slate-100 text-slate-400')}>
          {checkedCount}/{scope.trades.length} trades
        </span>
      </div>

      {/* Trade list */}
      <div>
        {scope.trades.map((trade) => (
          <div key={trade.tradeId} className="border-b border-slate-100 last:border-0">

            {/* Trade row */}
            <div className={cn(
              'flex items-center gap-3 px-4 py-3 transition-colors',
              trade.checked ? 'bg-[#6692C5]/5' : 'hover:bg-slate-50',
            )}>
              <input
                type="checkbox"
                checked={trade.checked}
                onChange={() => onToggleTradeChecked(scope.scopeId, trade.tradeId)}
                className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer accent-[#6692C5] flex-shrink-0"
              />
              <span className={cn('text-sm font-medium flex-1', trade.checked ? 'text-slate-700' : 'text-slate-500')}>
                {trade.tradeName}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {trade.buildings.length} building{trade.buildings.length !== 1 ? 's' : ''}
              </span>
              {trade.checked && (
                <button type="button" onClick={() => onToggleTradeOpen(scope.scopeId, trade.tradeId)}
                  className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                  <ChevronDown size={14}
                    className={cn('transition-transform', !trade.open && '-rotate-90')} />
                </button>
              )}
            </div>

            {/* Buildings — only when trade checked + open */}
            {trade.checked && trade.open && (
              <div className="border-t border-slate-100">
                {trade.buildings.map((building) => (
                  <div key={building.buildingId} className="border-b border-slate-100 last:border-0">

                    {/* Building row */}
                    <div className={cn(
                      'flex items-center gap-3 px-8 py-2 transition-colors',
                      building.checked ? 'bg-slate-50' : 'hover:bg-slate-50/60',
                    )}>
                      <input
                        type="checkbox"
                        checked={building.checked}
                        onChange={() => onToggleBuildingChecked(scope.scopeId, trade.tradeId, building.buildingId)}
                        className="w-3 h-3 rounded border-slate-300 cursor-pointer accent-[#6692C5] flex-shrink-0"
                      />
                      <span className={cn('text-xs font-semibold flex-1 uppercase tracking-wide',
                        building.checked ? 'text-slate-600' : 'text-slate-400')}>
                        {building.buildingName}
                      </span>
                      {building.checked && (
                        <button type="button"
                          onClick={() => onToggleBuildingOpen(scope.scopeId, trade.tradeId, building.buildingId)}
                          className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                          <ChevronDown size={12}
                            className={cn('transition-transform', !building.open && '-rotate-90')} />
                        </button>
                      )}
                    </div>

                    {/* Free-text notes */}
                    {building.checked && building.open && (
                      <div className="px-8 pb-4 pt-2">
                        <textarea
                          value={building.notes}
                          onChange={(e) => onUpdateNotes(scope.scopeId, trade.tradeId, building.buildingId, e.target.value)}
                          rows={3}
                          placeholder="Describe what you need to order for this building…"
                          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#6692C5]/40 focus:border-[#6692C5] resize-y placeholder:text-slate-300"
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

// ─── Shared card ──────────────────────────────────────────────────────────────

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}

// ─── Email preview ────────────────────────────────────────────────────────────

function EmailPreview({
  supplierName,
  deliveryMethod,
  deliveryDate,
  siteInfo,
  siteAddress,
  scopeData,
  scopes,
  smName,
}: {
  supplierName: string
  deliveryMethod: 'Delivery' | 'Pick Up'
  deliveryDate: string
  siteInfo: string
  siteAddress: string
  scopeData: import('@/lib/types').ScopeData | undefined
  scopes: ScopeSection[]
  smName: string
}) {
  const methodVerb = deliveryMethod === 'Delivery' ? 'delivery' : 'pick up'
  const formattedDate = deliveryDate
    ? new Intl.DateTimeFormat('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date(deliveryDate + 'T00:00:00'))
    : '—'

  const orderItems = scopes.flatMap((s) =>
    s.trades.filter((t) => t.checked).flatMap((t) =>
      t.buildings.filter((b) => b.checked).map((b) => ({
        title: `${t.tradeName} — ${b.buildingName}`,
        notes: b.notes,
      }))
    )
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Preview</span>
        <span className="text-xs text-slate-400">Sent to supplier on submit</span>
      </div>

      {/* Email body — scrollable */}
      <div className="overflow-y-auto max-h-[520px] px-5 py-4 space-y-4 text-[13px] leading-relaxed text-slate-700"
        style={{ fontFamily: 'Arial, sans-serif' }}>

        {/* Greeting */}
        <p>
          <strong>Hello {supplierName || <span className="text-slate-300 italic">Supplier Name</span>},</strong>
        </p>

        <p>
          Review PO Scope &amp; Schedule for PO Number:{' '}
          <strong className="text-slate-400 italic">TBD</strong>.
          {deliveryDate && (
            <> To accept the order and {methodVerb} on <strong>{formattedDate}</strong>.</>
          )}
        </p>

        {/* Accept CTA */}
        <div>
          <span>Click here → </span>
          <span className="inline-block px-4 py-1.5 rounded bg-[#5b7db1] text-white text-xs font-medium">
            Accept Order
          </span>
        </div>

        <hr className="border-slate-200" />

        {/* PO Details */}
        <div>
          <p className="font-bold text-slate-800 mb-3">Purchase Order Details</p>

          {orderItems.length === 0 ? (
            <p className="text-slate-300 italic text-xs">
              No items yet — tick trades and buildings on the left
            </p>
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

        {/* Job Site Details */}
        <div>
          <p className="font-bold text-slate-800 mb-2">Job Site Details</p>
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td className="font-semibold text-slate-500 pr-3 py-0.5 align-top whitespace-nowrap w-32">Primary Contact</td>
                <td className="text-slate-600 py-0.5">: {smName || <span className="text-slate-300 italic">—</span>}</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-500 pr-3 py-0.5 align-top whitespace-nowrap">Property Owner</td>
                <td className="text-slate-600 py-0.5">: {scopeData?.client_full_name || <span className="text-slate-300 italic">—</span>}</td>
              </tr>
              <tr>
                <td className="font-semibold text-slate-500 pr-3 py-0.5 align-top whitespace-nowrap">Site Address</td>
                <td className="text-slate-600 py-0.5">: {siteAddress || <span className="text-slate-300 italic">—</span>}</td>
              </tr>
              {siteInfo && (
                <tr>
                  <td className="font-semibold text-slate-500 pr-3 py-0.5 align-top whitespace-nowrap">Site Information</td>
                  <td className="text-slate-600 py-0.5">: {siteInfo}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <hr className="border-slate-200" />

        {/* Schedule + action buttons */}
        <div>
          <p className="font-bold text-slate-800 mb-1">Schedule and Confirm</p>
          {deliveryDate && <p className="text-xs text-slate-600 mb-1">Confirm {methodVerb} on {formattedDate}</p>}
          <p className="text-xs text-slate-600 mb-3">Confirm PO Scope above before accepting</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded border border-[#5b7db1] text-[#5b7db1] text-xs">Accept</span>
            <span className="px-3 py-1 rounded border border-[#5b7db1] text-[#5b7db1] text-xs">Reschedule</span>
            <span className="px-3 py-1 rounded border border-red-400 text-red-400 text-xs">Reject</span>
          </div>
        </div>

        <hr className="border-slate-200" />

        {/* Signature */}
        <div>
          <p className="text-slate-600">Kind Regards,</p>
          <p className="font-bold text-slate-700">{smName || '—'} | Site Manager</p>
          <div style={{ marginTop: '10px' }}>
            <img src="https://exlknzxmmqnehvximbyj.supabase.co/storage/v1/object/public/assets/company-logos/logo_ah.png"
              alt="AusHail Construction" style={{ height: '50px', width: 'auto', display: 'block' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
