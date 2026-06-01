import { api } from './fetcher'
import type { SupplierList } from '../types'

interface GetSuppliersParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  status?: string
}

export async function getSuppliersPaginated(
  token: string,
  params: GetSuppliersParams = {}
) {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    ...(params.search ? { search: params.search } : {}),
    ...(params.type ? { type: params.type } : {}),
    ...(params.status ? { status: params.status } : {}),
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

export async function updateSupplierData(token: string, body: unknown) {
  return api.post('/functions/v1/update-supplier', token, body)
}
