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

export interface POAttachment {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  uploadedAt: string
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

export interface PODetailScopeItem {
  status: string
  trades: PODetailScopeTrade[]
  is_checked: boolean
  building_id: string
  building_name: string
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
  order_details: PODetailOrderItem[]
  type: 'supplier' | 'subcontractor'
  po_amount: number
  delivery_method: string
  scope_snapshot: PODetailScopeItem[]
  supplier_name: string
  supplier_address: string
  supplier_email: string
  client_first_name: string
  client_last_name: string
  address: string
  ra_number: string
}

export interface PurchaseOrderDetailsEnvelope {
  data: PurchaseOrderDetailsRaw
}
