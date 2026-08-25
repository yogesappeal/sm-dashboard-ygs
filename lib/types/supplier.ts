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
  supplier_code: string
  created_at: string
  total_count?: number
  status: string
}

export interface SupplierList {
  data: SupplierData[]
  pagination: Pagination
}
