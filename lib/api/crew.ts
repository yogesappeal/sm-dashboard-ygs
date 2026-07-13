import { api } from './fetcher'
import type { Pagination } from '../types'

// NOTE: exact response field names are an assumption (id/name/role/company) —
// adjust CrewMember once the real get-crew-paginated response shape is confirmed.
export interface CrewMember {
  id: string
  name: string
  role?: string
  company?: string
}

export interface CrewPaginatedModel {
  data: CrewMember[]
  pagination: Pagination
}

interface GetCrewPaginatedParams {
  page?: number
  limit?: number
  orderDir?: 'asc' | 'desc'
  search?: string
  company?: string
}

export async function getCrewPaginated(token: string, params: GetCrewPaginatedParams = {}) {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 50),
    order_dir: params.orderDir ?? 'asc',
    search: params.search ?? '',
    company: params.company ?? 'AusHail',
  })
  return api.get<CrewPaginatedModel>(`/functions/v1/get-crew-paginated?${q}`, token)
}

export async function updateProjectCrew(
  token: string,
  body: { project_id: string; crew_id: string | null }
) {
  return api.post('/functions/v1/update-project-crew', token, body)
}
