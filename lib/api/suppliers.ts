import { api } from './fetcher'
import type { SupplierList } from '../types'

interface GetSuppliersParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  is_active?: boolean | null
  company?: string
  order_dir?: 'asc' | 'desc'
}

export async function getSuppliersPaginated(
  token: string,
  params: GetSuppliersParams = {}
) {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    company: params.company ?? 'AusHail',
    order_dir: params.order_dir ?? 'desc',
    ...(params.search ? { search: params.search } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(params.is_active != null ? { is_active: String(params.is_active) } : {}),
  })
  return api.get<SupplierList>(
    `/functions/v1/get-suppliers-paginated?${q}`,
    token
  )
}

export async function updateSupplierStatus(
  token: string,
  supplierId: string,
  status: string
) {
  return api.post('/functions/v1/update-supplier-status', token, {
    supplier_id: supplierId,
    status,
  })
}

export async function createSupplierData(token: string, body: unknown) {
  return api.post('/functions/v1/insert-supplier', token, body)
}

export async function updateSupplierData(token: string, body: unknown) {
  return api.post('/functions/v1/update-supplier', token, body)
}
