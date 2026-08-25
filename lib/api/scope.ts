import { api } from './fetcher'
import type { ScopeDataModel, ScopeData } from '../types'

interface GetScopeParams {
  page?: number
  limit?: number
  contractId?: string
}

export async function getScopingPaginated(
  token: string,
  params: GetScopeParams = {}
) {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    ...(params.contractId ? { contract_id: params.contractId } : {}),
  })
  return api.get<ScopeDataModel>(
    `/functions/v1/get-scopes-paginated?${q}`,
    token
  )
}

export async function getScopeDetailByContractId(
  token: string,
  contractId: string
) {
  const q = new URLSearchParams({ build_contract: contractId })
  return api.get<ScopeData>(
    `/functions/v1/get-scope-by-contract-id?${q}`,
    token
  )
}

export async function getScopeDetailByPOId(token: string, poId: string) {
  const q = new URLSearchParams({ po_id: poId })
  return api.get<ScopeData>(`/functions/v1/get-scope-by-po-id?${q}`, token)
}

export async function insertScopeWithItems(token: string, body: unknown) {
  return api.post('/functions/v1/insert-scopes-with-items', token, body)
}

export interface UpdateScopeItemsTrade {
  trade_id: string
  planned_po_date: string | null
}

export async function updateScopeItems(
  token: string,
  body: { scope_id: string; trades: UpdateScopeItemsTrade[] }
) {
  return api.post('/functions/v1/update-scope-items', token, body)
}

export async function updateScopeData(token: string, body: unknown) {
  return api.post('/functions/v1/update-scope', token, body)
}
