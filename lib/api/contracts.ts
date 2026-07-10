import { api } from './fetcher'
import type { ContractModel, DetailContracts, Crew, ContractDetailsEnvelope } from '../types'

interface GetContractsPaginatedParams {
  page?: number
  limit?: number
  search?: string
  status?: string
}

export async function getClientsPaginated(
  token: string,
  params: GetContractsPaginatedParams = {}
) {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    ...(params.search ? { search: params.search } : {}),
    ...(params.status ? { status: params.status } : {}),
  })
  return api.get<ContractModel>(
    `/functions/v1/get-clients-paginated?${q}`,
    token
  )
}

export async function getAllClientsPaginatedForOps(
  token: string,
  params: GetContractsPaginatedParams = {}
) {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    ...(params.search ? { search: params.search } : {}),
    ...(params.status ? { status: params.status } : {}),
  })
  return api.get<ContractModel>(
    `/functions/v1/all-clients-paginated?${q}`,
    token
  )
}

export async function searchContract(token: string, query: string) {
  const q = new URLSearchParams({ search: query })
  return api.get<ContractModel>(`/functions/v1/search-contract?${q}`, token)
}

export async function getContractDetails(token: string, contractId: string) {
  const q = new URLSearchParams({ contract_id: contractId })
  return api.get<DetailContracts>(
    `/functions/v1/contract-details?${q}`,
    token
  )
}

export async function getCrewPerProject(token: string, projectId: string) {
  const q = new URLSearchParams({ project_id: projectId })
  return api.get<Crew[]>(`/functions/v1/crew-list?${q}`, token)
}

// Returns the full nested payload (contract + crew + scopes + po_summary) from
// the same /contract-details endpoint as getContractDetails above — the actual
// runtime response is richer than DetailContracts, see ContractDetailsRaw.
export async function getContractDetailsFull(token: string, contractId: string) {
  const q = new URLSearchParams({ contract_id: contractId })
  const res = await api.get<ContractDetailsEnvelope>(
    `/functions/v1/contract-details?${q}`,
    token
  )
  return res.data
}

// NOTE: backend endpoint not implemented yet — placeholder following the
// `update-<entity>` convention used by update-scope-items etc. Adjust the
// path/body shape once the real endpoint exists.
export async function updateContractPlannedStart(
  token: string,
  body: { contract_id: string; planned_start_date: string | null }
) {
  return api.post('/functions/v1/update-contract', token, body)
}
