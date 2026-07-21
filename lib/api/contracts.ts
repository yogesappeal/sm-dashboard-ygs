import { api } from './fetcher'
import type { ContractModel, DetailContracts, Crew, ContractDetailsEnvelope, ContractScopeDropdownItem } from '../types'

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

// Contract dropdown for PO forms — flags whether each contract already has a
// scope (has_scope), so callers can separate/disable contracts that don't.
export async function getDropdownContractScope(token: string) {
  return api.get<ContractScopeDropdownItem[]>(
    '/functions/v1/get-dropdown-contract-scope',
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
// `projectId` is optional — omitted on initial load (backend picks the default
// project), passed once the user switches projects via the header dropdown.
export async function getContractDetailsFull(token: string, contractId: string, projectId?: string) {
  const q = new URLSearchParams({
    contract_id: contractId,
    ...(projectId ? { project_id: projectId } : {}),
  })
  const res = await api.get<ContractDetailsEnvelope>(
    `/functions/v1/contract-details?${q}`,
    token
  )
  return res.data
}

export async function updateProjectStartDate(
  token: string,
  body: { project_id: string; start_date: string | null }
) {
  return api.post('/functions/v1/update-project-start-date', token, body)
}
