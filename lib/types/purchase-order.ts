import type { Pagination } from './shared'

export interface POData {
  id: string
  poNumber: string
  type: 'supplier' | 'subcontractor'
  status: string
  supplierName: string
  contractId: string
  contractName: string
  totalAmount: number
  createdAt: string
  updatedAt: string
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
