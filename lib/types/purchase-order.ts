import type { Pagination } from './shared'

export interface POData {
  id: string
  po_number: string
  type: 'supplier' | 'subcontractor'
  status: string
  supplier_name: string
  total_count?: number
}

export interface PurchaseOrderList {
  data: POData[]
  pagination: Pagination
}

export interface POSummary {
  totalPO: number
  pending: number
  approved: number
  rejected: number
}

export interface PoSummaryData {
  summary: POSummary
}

export interface POFormValidation {
  isValid: boolean
  errors: Record<string, string>
}

export interface POSupplierInfo {
  supplierId: string
  supplierName: string
  email: string
  phone: string
  address: string
}

export interface POVendorData {
  id: string
  name: string
  email: string
  phone: string
  address: string
  abn: string
  bankDetails: string
}

// Raw shape returned by POST /functions/v1/po-attachments (one file per call).
// Not linked to any PO until its id is passed into attachment_ids on
// insert-purchase-order.
export interface POAttachment {
  attachment_id: string
  file_name: string
  file_type: string
  file_size_bytes: number
  file_size: string
}

export interface POAttachmentUploadEnvelope {
  success: boolean
  data: POAttachment
}

export interface SupDataMapping {
  supplierId: string
  supplierName: string
  supplierCode: string
}

export interface SubsDataMapping {
  subsId: string
  subsName: string
  subsCode: string
  tradeType: string
}

export interface MaterialItem {
  id: string
  description: string
  quantity: number
  unit: string
  unitRate: number
  amount: number
}

// ─── Raw shape returned by GET /functions/v1/purchase-order-details?po_id= ───

export interface PODetailOrderItem {
  id: string
  name: string
  shortDescription: string
  description: string
}

export interface PODetailScopeTrade {
  trade_id: string
  trade_name: string
  is_checked?: boolean
}

// Attachment summary as it comes back attached to a PO's detail response —
// distinct shape from POAttachment (the upload response), which has
// attachment_id/file_size_bytes instead of id/file_size.
export interface PODetailAttachment {
  id: string
  file_name: string
  file_size: number
  file_type: string
  created_at: string
}

export interface PurchaseOrderDetailsRaw {
  id: string
  contract_id: string
  supplier_id: string
  po_number: string
  scheduled_date: string | null
  original_scheduled_date: string | null
  new_requested_date: string | null
  reviewed_status: string
  reviewed_at: string | null
  external_notes: string
  status: string
  created_by: string
  created_at: string
  updated_at: string
  site_information: string
  order_details: PODetailOrderItem[] | { details: string } | string
  type: 'supplier' | 'subcontractor'
  po_amount: number
  delivery_method: string
  scope_snapshot: ScopeSnapshotBuilding[]
  supplier_name: string
  supplier_address: string
  supplier_email: string
  client_first_name: string
  client_last_name: string
  address: string
  ra_number: string
  attachments?: PODetailAttachment[]
}

export interface PurchaseOrderDetailsEnvelope {
  data: PurchaseOrderDetailsRaw
}

// ─── POST /functions/v1/insert-purchase-order — unified for supplier & ──────
// subcontractor PO creation (see insertPurchaseOrder in lib/api/purchase-orders.ts)

export interface ScopeSnapshotBuilding {
  building_id: string
  building_name?: string
  trades: PODetailScopeTrade[]
}

export interface InsertPurchaseOrderBody {
  contract_id: string
  supplier_id: string
  scheduled_date: string
  status: string
  type: 'supplier' | 'subcontractor'
  po_amount: number
  delivery_method: 'Delivery' | 'Pick Up'
  site_information: string
  // Supplier POs send a free-text note; subcontractor POs send it wrapped
  // as { details: string }.
  order_details: string | { details: string }
  scope_snapshot: ScopeSnapshotBuilding[]
  attachment_ids: string[]
  send_email: boolean
  service_type: 'supplier' | 'subcontractor'
}

export interface InsertPurchaseOrderResponse {
  success: boolean
  data: string
  email_sent: boolean
  email_error: string | null
}
