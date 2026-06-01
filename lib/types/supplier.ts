import type { Pagination } from './shared'

export interface SupplierData {
  id: string
  name: string
  email: string
  phone: string
  address: string
  type: string
  notes: string
  company: string
  supplierCode: string
  totalCount: number
  status: string
}

export interface SupplierList {
  data: SupplierData[]
  pagination: Pagination
}
