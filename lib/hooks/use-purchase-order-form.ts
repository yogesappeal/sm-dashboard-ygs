'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { useToast } from '@/components/shared/toast'
import {
  getDropdownContractScope,
  getSuppliersPaginated,
  getScopeDetailByContractId,
  getPurchaseOrderDetailsFull,
  insertPurchaseOrder,
  updatePurchaseOrder,
  autoSendEmailPurchaseOrder,
} from '@/lib/api'
import {
  buildScopeSnapshot,
  buildOrderDetailsItems,
  matchOrderDetailsToBuildings,
  orderItemId,
  normalizeOrderItems,
} from '@/lib/utils'
import type { InsertPurchaseOrderBody, UpdatePurchaseOrderBody } from '@/lib/types'

export interface POFormBuildingEntry {
  buildingId: string
  buildingName: string
  checked: boolean
  open: boolean
  // Only meaningful for supplier POs — folded into order_details on submit.
  notes: string
}

export interface POFormTradeSection {
  tradeId: string
  tradeName: string
  checked: boolean
  open: boolean
  buildings: POFormBuildingEntry[]
}

interface UsePurchaseOrderFormOptions {
  type: 'supplier' | 'subcontractor'
  editId?: string | null
  // When the contract is fixed by context rather than user-selected (e.g. the
  // contract-preview canvas, already scoped to one contract), pass it here —
  // the contract dropdown / selectContract() are only meant for screens where
  // the user actually picks it.
  contractId?: string
  // Called after a successful insert/update (+ auto-send if applicable).
  // Defaults to redirecting to the PO list, matching both dedicated forms —
  // pass this to reuse the hook somewhere else (e.g. a canvas) that needs to
  // navigate/refresh differently.
  onSaved?: () => void
}

// Shared logic behind the supplier and subcontractor "new/edit PO" forms:
// dropdown data, scope parsing + edit prefill, trade/building selection, and
// the insert vs update+auto-send submit flow. Keeping this in one place means
// a change to the PO submit contract (like the Draft→Sent-on-send-success
// rule) only needs to happen once instead of being kept in sync by hand
// across every screen that builds a PO.
export function usePurchaseOrderForm({ type, editId, contractId: fixedContractId, onSaved }: UsePurchaseOrderFormOptions) {
  const { token } = useAuthStore()
  const router = useRouter()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [selectedContractId, setContractIdRaw] = useState('')
  const contractId = fixedContractId ?? selectedContractId
  const [vendorId, setVendorId] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'Delivery' | 'Pick Up'>('Delivery')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [siteInfo, setSiteInfo] = useState('')
  const [jobDetails, setJobDetails] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [trades, setTrades] = useState<POFormTradeSection[]>([])
  const [attachmentIds, setAttachmentIds] = useState<string[]>([])
  const [attachmentsUploading, setAttachmentsUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // ── Dropdown data ─────────────────────────────────────────────────────────

  const { data: contractsData } = useQuery({
    queryKey: ['contracts-dropdown-scope'],
    queryFn: () => getDropdownContractScope(token!),
    enabled: !!token,
  })

  const { data: vendorsData } = useQuery({
    queryKey: [type === 'supplier' ? 'suppliers-dropdown' : 'subs-dropdown'],
    queryFn: () => getSuppliersPaginated(token!, { limit: 100, type: type === 'supplier' ? 'Supplier' : 'Subcontractor' }),
    enabled: !!token,
  })

  const contracts = contractsData ?? []
  const contractsWithScope = contracts.filter((c) => c.has_scope)
  const contractsWithoutScope = contracts.filter((c) => !c.has_scope)
  const vendors = vendorsData?.data ?? []
  const selectedContract = contracts.find((c) => c.id === contractId)
  const siteAddress = selectedContract?.street_address ?? ''

  // ── Scope + existing PO ───────────────────────────────────────────────────

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

  // Prefill scalar fields from the existing PO when editing.
  useEffect(() => {
    if (!editId || !poDetail) return
    setContractIdRaw(poDetail.contract_id)
    setVendorId(poDetail.supplier_id)
    setVendorName(poDetail.supplier_name)
    setDeliveryDate(poDetail.scheduled_date ? poDetail.scheduled_date.slice(0, 10) : '')
    setSiteInfo(poDetail.site_information ?? '')
    setAttachmentIds((poDetail.attachments ?? []).map((a) => a.id))
    if (type === 'supplier') {
      setDeliveryMethod(poDetail.delivery_method === 'Pick Up' ? 'Pick Up' : 'Delivery')
    } else {
      setJobDetails(normalizeOrderItems(poDetail.order_details)[0]?.description ?? '')
      setTotalPrice(poDetail.po_amount ? String(poDetail.po_amount) : '')
    }
  }, [editId, poDetail, type])

  // Parse scope_details into trade -> building sections, restoring checked
  // state from scope_snapshot and (supplier only) notes from order_details
  // when editing.
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
          checkedPairs.add(orderItemId(trade.trade_id, building.building_id))
        }
      }
    }

    const notes = type === 'supplier' && editId ? matchOrderDetailsToBuildings(poDetail?.order_details) : null

    const parsedTrades: POFormTradeSection[] = Array.from(tradeMap.values()).map((t) => ({
      tradeId: t.tradeId,
      tradeName: t.tradeName,
      checked: checkedTradeIds.has(t.tradeId),
      open: true,
      buildings: t.buildings.map((b) => {
        const checked = checkedPairs.has(orderItemId(t.tradeId, b.buildingId))
        return {
          buildingId: b.buildingId,
          buildingName: b.buildingName,
          checked,
          open: true,
          notes: checked && notes
            ? notes.byId.get(orderItemId(t.tradeId, b.buildingId))
              ?? notes.byName.get(`${t.tradeName.toLowerCase()}::${b.buildingName.toLowerCase()}`)
              ?? ''
            : '',
        }
      }),
    }))

    // Supplier-only: a scope with zero trades still shows one "General"
    // placeholder so a PO can be raised even against a scope-less contract.
    if (type === 'supplier' && parsedTrades.length === 0) {
      setTrades([{
        tradeId: 'general',
        tradeName: 'General',
        checked: false,
        open: true,
        buildings: [{ buildingId: 'general', buildingName: 'General', checked: false, open: true, notes: '' }],
      }])
    } else {
      setTrades(parsedTrades)
    }
  }, [scopeData, editId, poDetail, type])

  // ── Contract / vendor selection ───────────────────────────────────────────

  const selectContract = useCallback((id: string) => {
    setContractIdRaw(id)
    setTrades([])
  }, [])

  const selectVendor = useCallback((id: string) => {
    setVendorId(id)
    setVendorName(vendors.find((v) => v.id === id)?.name ?? '')
  }, [vendors])

  // ── Trade / building handlers ─────────────────────────────────────────────

  const toggleTradeChecked = useCallback((tradeId: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : { ...t, checked: !t.checked })), [])

  const toggleTradeOpen = useCallback((tradeId: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : { ...t, open: !t.open })), [])

  const toggleBuildingChecked = useCallback((tradeId: string, buildingId: string) =>
    setTrades((prev) => prev.map((t) => t.tradeId !== tradeId ? t : {
      ...t,
      buildings: t.buildings.map((b) => b.buildingId !== buildingId ? b : { ...b, checked: !b.checked, open: !b.checked }),
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

  // ── Derived ────────────────────────────────────────────────────────────────

  const checkedCount = trades.filter((t) => t.checked).length
  const dateLabel = type === 'supplier'
    ? (deliveryMethod === 'Delivery' ? 'Delivery Date' : 'Pick Up Date')
    : 'Schedule Date'

  // ── Validate ───────────────────────────────────────────────────────────────

  const validate = useCallback(() => {
    const e: Record<string, string> = {}
    if (!contractId) e.contractId = 'Select a contract'
    if (!vendorId) e.vendorId = type === 'supplier' ? 'Select a supplier' : 'Select a subcontractor'
    if (!deliveryDate) e.deliveryDate = type === 'supplier' ? `Select ${dateLabel.toLowerCase()}` : 'Select delivery date'
    if (type === 'subcontractor' && (!totalPrice || parseFloat(totalPrice) <= 0)) e.totalPrice = 'Enter total price'
    if (type === 'supplier') {
      if (trades.length === 0) e.scopes = 'No scope found for this contract'
      else if (checkedCount === 0) e.scopes = 'Select at least one trade to order'
    } else if (checkedCount === 0) {
      e.scopes = 'Select at least one trade'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }, [contractId, vendorId, deliveryDate, type, dateLabel, totalPrice, trades.length, checkedCount])

  // ── Submit ─────────────────────────────────────────────────────────────────

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
      if (onSaved) onSaved()
      else router.push('/purchase-orders')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (body: UpdatePurchaseOrderBody) => updatePurchaseOrder(token!, body),
  })

  const handleSubmit = (isDraft: boolean) => {
    if (!validate()) return
    if (attachmentsUploading) return

    const orderDetails = type === 'supplier' ? buildOrderDetailsItems(trades) : { details: jobDetails }
    const scopeSnapshot = buildScopeSnapshot(trades)
    const resolvedDeliveryMethod = type === 'supplier' ? deliveryMethod : 'Delivery'
    const poAmount = type === 'subcontractor' ? (parseFloat(totalPrice) || 0) : 0

    if (editId) {
      updateMutation.mutate({
        _id: editId,
        _contract_id: contractId,
        _supplier_id: vendorId,
        _scheduled_date: deliveryDate,
        // update-purchase-order only ever saves as Draft — Submit sends the
        // email below, and a successful send is what promotes the PO to
        // Sent server-side. This way a failed send just leaves it as Draft
        // instead of stuck "Submitted" with nothing actually sent.
        _status: 'PO Draft',
        _type: type,
        _po_amount: poAmount,
        _delivery_method: resolvedDeliveryMethod,
        _site_information: siteInfo,
        _order_details: orderDetails,
        _scope_snapshot: scopeSnapshot,
      }, {
        onSuccess: async () => {
          queryClient.invalidateQueries({ queryKey: ['po-detail', editId] })
          queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
          if (!isDraft) {
            try {
              await autoSendEmailPurchaseOrder(token!, editId, type)
              queryClient.invalidateQueries({ queryKey: ['po-detail', editId] })
              queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
              toast('PO submitted and sent successfully.', 'success')
            } catch {
              toast('Failed to send the email — PO kept as Draft, please try submitting again.', 'error')
            }
          } else {
            toast('PO saved as draft.', 'success')
          }
          if (onSaved) onSaved()
          else router.push('/purchase-orders')
        },
      })
    } else {
      insertMutation.mutate({
        contract_id: contractId,
        supplier_id: vendorId,
        delivery_method: resolvedDeliveryMethod,
        scheduled_date: deliveryDate,
        site_information: siteInfo,
        type,
        service_type: type,
        status: isDraft ? 'PO Draft' : 'PO Submitted',
        po_amount: poAmount,
        order_details: orderDetails,
        scope_snapshot: scopeSnapshot,
        attachment_ids: attachmentIds,
        send_email: !isDraft,
      })
    }
  }

  // Whether the user has entered anything worth warning about before losing —
  // used to gate both the browser beforeunload guard and an in-app "leave
  // without saving?" confirmation.
  const isDirty = !!(
    contractId || vendorId || deliveryDate || siteInfo || jobDetails || totalPrice ||
    attachmentIds.length > 0 || attachmentsUploading || trades.some((t) => t.checked)
  )

  return {
    // dropdown data
    contracts, contractsWithScope, contractsWithoutScope, vendors, selectedContract, siteAddress,
    isDirty,
    // field state
    contractId, selectContract,
    vendorId, vendorName, selectVendor,
    deliveryMethod, setDeliveryMethod,
    deliveryDate, setDeliveryDate,
    siteInfo, setSiteInfo,
    jobDetails, setJobDetails,
    totalPrice, setTotalPrice,
    attachmentIds, setAttachmentIds,
    attachmentsUploading, setAttachmentsUploading,
    errors,
    // scope / trades
    trades, scopeData, scopeLoading, scopeError, checkedCount, dateLabel,
    toggleTradeChecked, toggleTradeOpen, toggleBuildingChecked, toggleBuildingOpen, updateNotes,
    // edit mode
    poDetail, poDetailLoading,
    // submit
    validate,
    handleSubmit,
    isPending: insertMutation.isPending || updateMutation.isPending,
    isError: insertMutation.isError || updateMutation.isError,
    isSuccess: insertMutation.isSuccess || updateMutation.isSuccess,
  }
}

// Convenience for pages that read `editId` straight from the URL, since both
// dedicated forms do this identically.
export function usePOEditIdParam() {
  return useSearchParams().get('edit')
}
