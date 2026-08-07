'use client'

import { Suspense, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { ArrowLeft, ChevronDown, PackagePlus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateInput } from '@/components/ui/date-input'
import { PoAttachmentsSection, FEATURE_ATTACHMENTS } from '@/components/forms/po-attachments-section'
import { BulletNotesInput } from '@/components/forms/bullet-notes-input'
import { AccessRestrictedNotice } from '@/components/shared/access-restricted-notice'
import { usePermission } from '@/lib/hooks/use-permission'
import { usePurchaseOrderForm, usePOEditIdParam, type POFormTradeSection } from '@/lib/hooks/use-purchase-order-form'
import type { ScopeData } from '@/lib/types'

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function POSupplierFormPage() {
  const canCreate = usePermission('po:create')
  if (!canCreate) {
    return <AccessRestrictedNotice message="You don't have permission to create a purchase order." />
  }
  return <Suspense><POSupplierFormInner /></Suspense>
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function POSupplierFormInner() {
  const { user } = useAuthStore()
  const router = useRouter()
  const editId = usePOEditIdParam()

  const form = usePurchaseOrderForm({ type: 'supplier', editId })

  // ── Unsaved-changes guard ─────────────────────────────────────────────────
  // Warn before losing in-progress input.

  const isSaved = form.isSuccess

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!form.isDirty || isSaved) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [form.isDirty, isSaved])

  const handleBack = () => {
    if (form.isDirty && !isSaved &&
        !window.confirm('You have unsaved changes. Are you sure you want to leave this page?')) {
      return
    }
    router.back()
  }

  const fieldCls = (k: string) =>
    cn('w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6692C5]/30',
      form.errors[k] ? 'border-red-300' : 'border-slate-200')

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handleBack} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600">
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
                <select value={form.contractId}
                  onChange={(e) => form.selectContract(e.target.value)}
                  className={fieldCls('contractId')}>
                  <option value="">Select contract...</option>
                  {form.contractsWithScope.length > 0 && (
                    <optgroup label="Has Scope">
                      {form.contractsWithScope.map((c) => <option key={c.id} value={c.id}>{c.dropdown_label}</option>)}
                    </optgroup>
                  )}
                  {form.contractsWithoutScope.length > 0 && (
                    <optgroup label="No Scope Yet">
                      {form.contractsWithoutScope.map((c) => (
                        <option key={c.id} value={c.id} disabled>{c.dropdown_label} — no scope</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {form.errors.contractId && <p className="text-xs text-red-400 mt-1">{form.errors.contractId}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Supplier <span className="text-red-400">*</span>
                </label>
                <select value={form.vendorId} onChange={(e) => form.selectVendor(e.target.value)} className={fieldCls('vendorId')}>
                  <option value="">Select supplier...</option>
                  {form.vendors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {form.errors.vendorId && <p className="text-xs text-red-400 mt-1">{form.errors.vendorId}</p>}
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
                      checked={form.deliveryMethod === method}
                      onChange={() => form.setDeliveryMethod(method)}
                      className="w-3.5 h-3.5 accent-[#6692C5] cursor-pointer"
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 sm:w-1/2 sm:pr-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {form.dateLabel} <span className="text-red-400">*</span>
              </label>
              <DateInput value={form.deliveryDate} min={form.minDeliveryDate}
                onChange={form.setDeliveryDate}
                className={fieldCls('deliveryDate')} hasError={!!form.errors.deliveryDate} />
              {form.errors.deliveryDate && <p className="text-xs text-red-400 mt-1">{form.errors.deliveryDate}</p>}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Site Information</label>
              <textarea value={form.siteInfo} onChange={(e) => form.setSiteInfo(e.target.value)} rows={2}
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

            {form.errors.scopes && <p className="text-xs text-red-400">{form.errors.scopes}</p>}

            {/* States */}
            {!form.contractId && (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <PackagePlus size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Select a contract above to load scope</p>
              </div>
            )}

            {form.contractId && form.scopeLoading && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading scope...</span>
              </div>
            )}

            {form.contractId && !form.scopeLoading && form.scopeError && (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <PackagePlus size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No scope found for this contract</p>
              </div>
            )}

            {form.trades.length > 0 && (
              <TradeList
                scopeData={form.scopeData}
                trades={form.trades}
                checkedCount={form.checkedCount}
                onToggleTradeChecked={form.toggleTradeChecked}
                onToggleTradeOpen={form.toggleTradeOpen}
                onToggleBuildingChecked={form.toggleBuildingChecked}
                onToggleBuildingOpen={form.toggleBuildingOpen}
                onUpdateNotes={form.updateNotes}
              />
            )}
          </div>

          {FEATURE_ATTACHMENTS && (!editId || form.poDetail) && (
            <PoAttachmentsSection
              attachmentIds={form.attachmentIds}
              onAttachmentIdsChange={form.setAttachmentIds}
              onUploadingChange={form.setAttachmentsUploading}
              initialAttachments={form.poDetail?.attachments}
            />
          )}
        </div>

        {/* ── Right col ── */}
        <div className="space-y-3">
          <EmailPreview
            supplierName={form.vendorName}
            deliveryMethod={form.deliveryMethod}
            deliveryDate={form.deliveryDate}
            siteInfo={form.siteInfo}
            siteAddress={form.siteAddress}
            scopeData={form.scopeData}
            trades={form.trades}
            smName={user?.full_name ?? ''}
          />

          <div className="space-y-2">
            <button onClick={() => form.handleSubmit(false)}
              disabled={form.isPending || form.attachmentsUploading || (!!editId && form.poDetailLoading)}
              className="w-full py-2.5 bg-[#6692C5] hover:bg-[#4F7CB3] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {form.attachmentsUploading ? 'Uploading attachments...' : form.isPending ? 'Sending...' : 'Send PO'}
            </button>
            <button onClick={() => form.handleSubmit(true)}
              disabled={form.isPending || form.attachmentsUploading || (!!editId && form.poDetailLoading)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              Save as Draft
            </button>
          </div>

          {form.isError && (
            <p className="text-xs text-red-400 text-center">Failed to save. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Trade list ───────────────────────────────────────────────────────────────

function TradeList({
  scopeData, trades, checkedCount,
  onToggleTradeChecked, onToggleTradeOpen,
  onToggleBuildingChecked, onToggleBuildingOpen, onUpdateNotes,
}: {
  scopeData: ScopeData | undefined
  trades: POFormTradeSection[]
  checkedCount: number
  onToggleTradeChecked: (tradeId: string) => void
  onToggleTradeOpen: (tradeId: string) => void
  onToggleBuildingChecked: (tradeId: string, buildingId: string) => void
  onToggleBuildingOpen: (tradeId: string, buildingId: string) => void
  onUpdateNotes: (tradeId: string, buildingId: string, notes: string) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Scope header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-sm font-semibold text-slate-700 flex-1 truncate">{scopeData?.scope_name}</span>
        {scopeData?.scope_number && (
          <span className="text-xs text-slate-400 font-mono flex-shrink-0">{scopeData.scope_number}</span>
        )}
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
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
                        onChange={() => onToggleBuildingChecked(trade.tradeId, building.buildingId)}
                        className="w-3 h-3 rounded border-slate-300 cursor-pointer accent-[#6692C5] flex-shrink-0"
                      />
                      <span className={cn('text-xs font-semibold flex-1 uppercase tracking-wide',
                        building.checked ? 'text-slate-600' : 'text-slate-400')}>
                        {building.buildingName}
                      </span>
                      {building.checked && (
                        <button type="button"
                          onClick={() => onToggleBuildingOpen(trade.tradeId, building.buildingId)}
                          className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                          <ChevronDown size={12}
                            className={cn('transition-transform', !building.open && '-rotate-90')} />
                        </button>
                      )}
                    </div>

                    {/* Free-text notes */}
                    {building.checked && building.open && (
                      <div className="px-8 pb-4 pt-2">
                        <BulletNotesInput
                          value={building.notes}
                          onChange={(notes) => onUpdateNotes(trade.tradeId, building.buildingId, notes)}
                          placeholder="Describe what you need to order for this building…"
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
  trades,
  smName,
}: {
  supplierName: string
  deliveryMethod: 'Delivery' | 'Pick Up'
  deliveryDate: string
  siteInfo: string
  siteAddress: string
  scopeData: ScopeData | undefined
  trades: POFormTradeSection[]
  smName: string
}) {
  const methodVerb = deliveryMethod === 'Delivery' ? 'delivery' : 'pick up'
  const formattedDate = deliveryDate
    ? new Intl.DateTimeFormat('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date(deliveryDate + 'T00:00:00'))
    : '—'

  const orderItems = trades.filter((t) => t.checked).flatMap((t) =>
    t.buildings.filter((b) => b.checked).map((b) => ({
      title: `${t.tradeName} | ${b.buildingName}`,
      notes: b.notes,
    }))
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
          <span className="inline-block px-4 py-1.5 rounded bg-slate-300 text-slate-500 text-xs font-medium">
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
            <span className="px-3 py-1 rounded border border-slate-300 text-slate-400 text-xs">Accept</span>
            <span className="px-3 py-1 rounded border border-slate-300 text-slate-400 text-xs">Reschedule</span>
            <span className="px-3 py-1 rounded border border-slate-300 text-slate-400 text-xs">Reject</span>
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
