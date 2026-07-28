'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, ClipboardList, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import {
  getDropdownContractScope,
  getSuppliersPaginated,
  getScopeDetailByContractId,
  getPurchaseOrderDetailsFull,
  insertPurchaseOrder,
  updatePurchaseOrder,
  autoSendEmailPurchaseOrder,
} from '@/lib/api'
import { cn, buildScopeSnapshot, normalizeOrderItems } from '@/lib/utils'
import { PoAttachmentsSection, FEATURE_ATTACHMENTS } from '@/components/forms/po-attachments-section'
import { BulletNotesInput } from '@/components/forms/bullet-notes-input'
import { AccessRestrictedNotice } from '@/components/shared/access-restricted-notice'
import { usePermission } from '@/lib/hooks/use-permission'
import { useToast } from '@/components/shared/toast'
import type { ScopeData, InsertPurchaseOrderBody, UpdatePurchaseOrderBody } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuildingEntry {
  buildingId: string
  buildingName: string
  checked: boolean
}

interface TradeSection {
  tradeId: string
  tradeName: string
  checked: boolean
  open: boolean
  buildings: BuildingEntry[]
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function POSubsFormPage() {
  const canCreate = usePermission('po:create')
  if (!canCreate) {
    return <AccessRestrictedNotice message="You don't have permission to create a purchase order." />
  }
  return <Suspense><POSubsFormInner /></Suspense>
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function POSubsFormInner() {
  const { token, user } = useAuthStore()
  const router          = useRouter()
  const editId          = useSearchParams().get('edit')
  const toast            = useToast()
  const queryClient     = useQueryClient()

  const [contractId, setContractId]     = useState('')
  const [subsId, setSubsId]             = useState('')
  const [subsName, setSubsName]         = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [siteInfo, setSiteInfo]         = useState('')
  const [jobDetails, setJobDetails]     = useState('')
  const [totalPrice, setTotalPrice]     = useState('')
  const [trades, setTrades]             = useState<TradeSection[]>([])
  const [attachmentIds, setAttachmentIds] = useState<string[]>([])
  const [attachmentsUploading, setAttachmentsUploading] = useState(false)
  const [errors, setErrors]             = useState<Record<string, string>>({})

  // ── Queries ───────────────────────────────────────────────────────────────

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-dropdown-scope'],
    queryFn: () => getDropdownContractScope(token!),
    enabled: !!token,
  })

  const { data: subsData } = useQuery({
    queryKey: ['subs-dropdown'],
    queryFn: () => getSuppliersPaginated(token!, { limit: 100, type: 'Subcontractor' }),
    enabled: !!token,
  })

  const { data: scopeData, isLoading: scopeLoading, isError: scopeError } = useQuery({
    queryKey: ['scope-by-contract', contractId],
    queryFn: () => getScopeDetailByContractId(token!, contractId),
    enabled: !!token && !!contractId,
  })

  const { data: poDetail, isLoading: poDetailLoading } = useQuery({
    queryKey: ['po-detail', editId],
    queryFn: () => getPurchaseOrderDetailsFull(token!, editId!),
    enabled: !!token && !!editId,
  })

  const contracts             = contractsData ?? []
  const contractsWithScope    = contracts.filter((c) => c.has_scope)
  const contractsWithoutScope = contracts.filter((c) => !c.has_scope)
  const subsList         = subsData?.data ?? []
  const selectedContract = contracts.find((c) => c.id === contractId)
  const siteAddress      = selectedContract?.street_address ?? ''

  // Prefill the form from the existing PO when editing a draft.
  useEffect(() => {
    if (!editId || !poDetail) return
    setContractId(poDetail.contract_id)
    setSubsId(poDetail.supplier_id)
    setSubsName(poDetail.supplier_name)
    setDeliveryDate(poDetail.scheduled_date ? poDetail.scheduled_date.slice(0, 10) : '')
    setSiteInfo(poDetail.site_information ?? '')
    setJobDetails(normalizeOrderItems(poDetail.order_details)[0]?.description ?? '')
    setTotalPrice(poDetail.po_amount ? String(poDetail.po_amount) : '')
    setAttachmentIds((poDetail.attachments ?? []).map((a) => a.id))
  }, [editId, poDetail])

  // Auto-parse scope_details into trade → building structure, carrying over
  // whichever trades/buildings were already checked on the PO being edited.
  useEffect(() => {
    if (!scopeData) { setTrades([]); return }

    const tradeMap = new Map<string, { tradeId: string; tradeName: string; buildings: { buildingId: string; buildingName: string }[] }>()

    for (const building of scopeData.scope_details ?? []) {
      for (const trade of building.trades ?? []) {
        const key = trade.trade_name.trim().toLowerCase()
        if (!tradeMap.has(key)) {
          tradeMap.set(key, { tradeId: trade.trade_id, tradeName: trade.trade_name, buildings: [] })
        }
        tradeMap.get(key)!.buildings.push({ buildingId: building.building_id, buildingName: building.building_name })
      }
    }

    const checkedTradeIds = new Set<string>()
    const checkedPairs = new Set<string>()
    if (editId) {
      for (const building of poDetail?.scope_snapshot ?? []) {
        for (const trade of building.trades ?? []) {
          checkedTradeIds.add(trade.trade_id)
          checkedPairs.add(`${trade.trade_id}::${building.building_id}`)
        }
      }
    }

    setTrades(Array.from(tradeMap.values()).map((t) => ({
      tradeId:   t.tradeId,
      tradeName: t.tradeName,
      checked:   checkedTradeIds.has(t.tradeId),
      open:      true,
      buildings: t.buildings.map((b) => ({ ...b, checked: checkedPairs.has(`${t.tradeId}::${b.buildingId}`) })),
    })))
  }, [scopeData, editId, poDetail])

  // ── Trade / building handlers ─────────────────────────────────────────────

  const toggleTradeChecked = useCallback((tradeId: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : { ...t, checked: !t.checked })), [])

  const toggleTradeOpen = useCallback((tradeId: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : { ...t, open: !t.open })), [])

  const toggleBuildingChecked = useCallback((tradeId: string, buildingId: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : {
      ...t,
      buildings: t.buildings.map((b) => b.buildingId !== buildingId ? b : { ...b, checked: !b.checked }),
    })), [])

  // ── Submit ────────────────────────────────────────────────────────────────

  const insertMutation = useMutation({
    mutationFn: (body: InsertPurchaseOrderBody) => insertPurchaseOrder(token!, body),
    onSuccess: (res, variables) => {
      if (!variables.send_email) {
        toast('PO saved as draft.', 'success')
      } else if (res.email_error) {
        toast(`PO submitted, but the email failed to send: ${res.email_error}`, 'error')
      } else {
        toast('PO submitted and sent successfully.', 'success')
      }
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      router.push('/purchase-orders')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (body: UpdatePurchaseOrderBody) => updatePurchaseOrder(token!, body),
  })

  // ── Unsaved-changes guard ─────────────────────────────────────────────────
  // Warn before losing in-progress input.

  const isDirty = !!(
    contractId || subsId || deliveryDate || siteInfo || jobDetails || totalPrice ||
    attachmentIds.length > 0 || attachmentsUploading || trades.some((t) => t.checked)
  )

  const isSaved = insertMutation.isSuccess || updateMutation.isSuccess

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty || isSaved) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, isSaved])

  const handleBack = () => {
    if (isDirty && !isSaved &&
        !window.confirm('You have unsaved changes. Are you sure you want to leave this page?')) {
      return
    }
    router.back()
  }

  const checkedCount = trades.filter((t) => t.checked).length

  const validate = () => {
    const e: Record<string, string> = {}
    if (!contractId)   e.contractId   = 'Select a contract'
    if (!subsId)       e.subsId       = 'Select a subcontractor'
    if (!deliveryDate) e.deliveryDate = 'Select delivery date'
    if (!totalPrice || parseFloat(totalPrice) <= 0) e.totalPrice = 'Enter total price'
    if (checkedCount === 0) e.scopes = 'Select at least one trade'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (isDraft: boolean) => {
    if (!validate()) return
    if (attachmentsUploading) return
    if (editId) {
      updateMutation.mutate({
        _id:               editId,
        _contract_id:      contractId,
        _supplier_id:      subsId,
        _scheduled_date:   deliveryDate,
        // update-purchase-order only ever saves as Draft — Submit sends the
        // email below, and a successful send is what promotes the PO to
        // Sent server-side. This way a failed send just leaves it as Draft
        // instead of stuck "Submitted" with nothing actually sent.
        _status:           'PO Draft',
        _type:             'subcontractor',
        _po_amount:        parseFloat(totalPrice) || 0,
        _delivery_method:  'Delivery',
        _site_information: siteInfo,
        _order_details:    { details: jobDetails },
        _scope_snapshot:   buildScopeSnapshot(trades),
      }, {
        onSuccess: async () => {
          queryClient.invalidateQueries({ queryKey: ['po-detail', editId] })
          queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
          if (!isDraft) {
            try {
              await autoSendEmailPurchaseOrder(token!, editId, 'subcontractor')
              queryClient.invalidateQueries({ queryKey: ['po-detail', editId] })
              queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
              toast('PO submitted and sent successfully.', 'success')
            } catch {
              toast('Failed to send the email — PO kept as Draft, please try submitting again.', 'error')
            }
          } else {
            toast('PO saved as draft.', 'success')
          }
          router.push('/purchase-orders')
        },
      })
    } else {
      insertMutation.mutate({
        contract_id:      contractId,
        supplier_id:      subsId,
        delivery_method:  'Delivery',
        scheduled_date:   deliveryDate,
        site_information: siteInfo,
        type:             'subcontractor',
        service_type:     'subcontractor',
        status:           isDraft ? 'PO Draft' : 'PO Submitted',
        po_amount:        parseFloat(totalPrice) || 0,
        order_details:    { details: jobDetails },
        scope_snapshot:   buildScopeSnapshot(trades),
        attachment_ids:   attachmentIds,
        send_email:       !isDraft,
      })
    }
  }

  const fieldCls = (field: string) =>
    cn('w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30',
      errors[field] ? 'border-red-300' : 'border-slate-200')

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBack}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">
          {editId ? 'Edit Subcontractor PO' : 'New Subcontractor PO'}
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
                <select value={contractId} onChange={(e) => {
                  setContractId(e.target.value)
                  setTrades([])
                }} className={fieldCls('contractId')}>
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
                  Subcontractor <span className="text-red-400">*</span>
                </label>
                <select value={subsId} onChange={(e) => {
                  setSubsId(e.target.value)
                  setSubsName(subsList.find((s) => s.id === e.target.value)?.name ?? '')
                }} className={fieldCls('subsId')}>
                  <option value="">Select subcontractor...</option>
                  {subsList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.subsId && <p className="text-xs text-red-400 mt-1">{errors.subsId}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Schedule Date <span className="text-red-400">*</span>
                </label>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}
                  className={fieldCls('deliveryDate')} />
                {errors.deliveryDate && <p className="text-xs text-red-400 mt-1">{errors.deliveryDate}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Total Price <span className="text-red-400">*</span>
                </label>
                <input type="number" min="0" step="0.01" value={totalPrice} placeholder="0.00"
                  onChange={(e) => setTotalPrice(e.target.value)} className={fieldCls('totalPrice')} />
                {errors.totalPrice && <p className="text-xs text-red-400 mt-1">{errors.totalPrice}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Site Information</label>
              <textarea value={siteInfo} onChange={(e) => setSiteInfo(e.target.value)} rows={2}
                placeholder="Enter site information..."
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30 resize-none" />
            </div>
          </FormCard>

          {/* Job Scope */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Job Scope</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tick the trades and buildings this subcontractor will work on</p>
            </div>

            {errors.scopes && <p className="text-xs text-red-400">{errors.scopes}</p>}

            {!contractId && (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <ClipboardList size={28} className="mx-auto text-slate-300 mb-2" />
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
                <ClipboardList size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No scope found for this contract</p>
              </div>
            )}

            {trades.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Scope header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{scopeData?.scope_name}</p>
                    {scopeData?.scope_number && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{scopeData.scope_number}</p>
                    )}
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-3',
                    checkedCount > 0 ? 'bg-[#6692C5]/10 text-[#6692C5]' : 'bg-slate-100 text-slate-400')}>
                    {checkedCount}/{trades.length} trades
                  </span>
                </div>

                {/* Trade list */}
                <div>
                  {trades.map((trade) => (
                    <div key={trade.tradeId} className="border-b border-slate-100 last:border-0">

                      {/* Trade row */}
                      <div className={cn(
                        'flex items-center gap-3 px-4 py-3 transition-colors',
                        trade.checked ? 'bg-[#6692C5]/5' : 'hover:bg-slate-50',
                      )}>
                        <input
                          type="checkbox"
                          checked={trade.checked}
                          onChange={() => toggleTradeChecked(trade.tradeId)}
                          className="w-3.5 h-3.5 rounded border-slate-300 cursor-pointer accent-[#6692C5] flex-shrink-0"
                        />
                        <span className={cn('text-sm font-medium flex-1',
                          trade.checked ? 'text-slate-700' : 'text-slate-500')}>
                          {trade.tradeName}
                        </span>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {trade.buildings.length} building{trade.buildings.length !== 1 ? 's' : ''}
                        </span>
                        {trade.checked && (
                          <button type="button" onClick={() => toggleTradeOpen(trade.tradeId)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                            <ChevronDown size={14}
                              className={cn('transition-transform', !trade.open && '-rotate-90')} />
                          </button>
                        )}
                      </div>

                      {/* Building checkboxes */}
                      {trade.checked && trade.open && (
                        <div className="border-t border-slate-100">
                          {trade.buildings.map((building) => (
                            <label key={building.buildingId}
                              className={cn(
                                'flex items-center gap-3 px-8 py-2 cursor-pointer transition-colors',
                                building.checked ? 'bg-slate-50' : 'hover:bg-slate-50/60',
                              )}>
                              <input
                                type="checkbox"
                                checked={building.checked}
                                onChange={() => toggleBuildingChecked(trade.tradeId, building.buildingId)}
                                className="w-3 h-3 rounded border-slate-300 cursor-pointer accent-[#6692C5] flex-shrink-0"
                              />
                              <span className={cn('text-xs font-semibold uppercase tracking-wide',
                                building.checked ? 'text-slate-600' : 'text-slate-400')}>
                                {building.buildingName}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Job description */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Job Description</label>
              <BulletNotesInput
                value={jobDetails}
                onChange={setJobDetails}
                rows={5}
                placeholder="Describe the job scope, materials to be used, work requirements..."
              />
            </div>

            {FEATURE_ATTACHMENTS && (!editId || poDetail) && (
              <PoAttachmentsSection
                attachmentIds={attachmentIds}
                onAttachmentIdsChange={setAttachmentIds}
                onUploadingChange={setAttachmentsUploading}
                initialAttachments={poDetail?.attachments}
              />
            )}
          </div>
        </div>

        {/* ── Right col ── */}
        <div className="space-y-3">
          <EmailPreview
            subsName={subsName}
            deliveryDate={deliveryDate}
            siteInfo={siteInfo}
            siteAddress={siteAddress}
            jobDetails={jobDetails}
            totalPrice={totalPrice}
            scopeData={scopeData}
            trades={trades}
            smName={user?.full_name ?? ''}
          />

          <div className="space-y-2">
            <button onClick={() => handleSubmit(false)}
              disabled={insertMutation.isPending || updateMutation.isPending || attachmentsUploading || (!!editId && poDetailLoading)}
              className="w-full py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {attachmentsUploading ? 'Uploading attachments...'
                : (insertMutation.isPending || updateMutation.isPending) ? 'Submitting...'
                : 'Submit PO'}
            </button>
            <button onClick={() => handleSubmit(true)}
              disabled={insertMutation.isPending || updateMutation.isPending || attachmentsUploading || (!!editId && poDetailLoading)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              Save as Draft
            </button>
          </div>

          {(insertMutation.isError || updateMutation.isError) && (
            <p className="text-xs text-red-400 text-center">Failed to save. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Email preview ────────────────────────────────────────────────────────────

function EmailPreview({
  subsName, deliveryDate, siteInfo, siteAddress, jobDetails, totalPrice, scopeData, trades, smName,
}: {
  subsName: string
  deliveryDate: string
  siteInfo: string
  siteAddress: string
  jobDetails: string
  totalPrice: string
  scopeData: ScopeData | undefined
  trades: TradeSection[]
  smName: string
}) {
  const formattedDate = deliveryDate
    ? new Intl.DateTimeFormat('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date(deliveryDate + 'T00:00:00'))
    : '—'

  const formattedPrice = totalPrice && parseFloat(totalPrice) > 0
    ? `$${parseFloat(totalPrice).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`
    : null

  const checkedTrades = trades.filter((t) => t.checked)

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email Preview</span>
        <span className="text-xs text-slate-400">Sent to subcontractor on submit</span>
      </div>

      <div className="overflow-y-auto max-h-[560px] px-5 py-4 space-y-4 text-[13px] leading-relaxed text-slate-700"
        style={{ fontFamily: 'Arial, sans-serif' }}>

        <p>
          <strong>Hello {subsName || <span className="text-slate-300 italic">Subcontractor Name</span>},</strong>
        </p>
        <p>
          Please review the Purchase Order for PO Number:{' '}
          <strong className="text-slate-400 italic">TBD</strong>.
          {deliveryDate && <> Work is scheduled for <strong>{formattedDate}</strong>.</>}
        </p>

        <div>
          <span>Click here → </span>
          <span className="inline-block px-4 py-1.5 rounded bg-[#5b7db1] text-white text-xs font-medium">
            Accept Order
          </span>
        </div>

        <hr className="border-slate-200" />

        {/* Scope of work */}
        <div>
          <p className="font-bold text-slate-800 mb-2">Scope of Work</p>
          {/* {scopeData && (
            <p className="text-xs text-slate-500 font-mono mb-2">{scopeData.scope_name}</p>
          )} */}
          {checkedTrades.length === 0 ? (
            <p className="text-slate-300 italic text-xs">No trades selected yet</p>
          ) : (
            <div className="space-y-2">
              {checkedTrades.map((trade) => {
                const checkedBuildings = trade.buildings.filter((b) => b.checked)
                return (
                  <div key={trade.tradeId}>
                    <p className="text-sm font-semibold text-slate-700">{trade.tradeName}</p>
                    {checkedBuildings.length > 0 ? (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {checkedBuildings.map((b) => b.buildingName).join(', ')}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300 italic mt-0.5">All buildings</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Job description */}
        <div>
          <p className="font-bold text-slate-800 mb-1">Job Description</p>
          {jobDetails ? (
            <p className="text-slate-600 text-xs whitespace-pre-wrap">{jobDetails}</p>
          ) : (
            <p className="text-slate-300 italic text-xs">No description added yet</p>
          )}
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

        {/* Job site details */}
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

        {/* Schedule + actions */}
        <div>
          <p className="font-bold text-slate-800 mb-1">Schedule and Confirm</p>
          {deliveryDate && <p className="text-xs text-slate-600 mb-1">Confirm work date on {formattedDate}</p>}
          <p className="text-xs text-slate-600 mb-3">Confirm Scope of Work above before accepting</p>
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

// ─── Shared card ──────────────────────────────────────────────────────────────

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}
