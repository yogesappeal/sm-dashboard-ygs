import { api } from './fetcher'
import type { DashboardMetrics, DashboardResponse } from '../types'

function normalizeMetrics(res: DashboardResponse): DashboardMetrics {
  const item = res.response?.[0]
  return { metrics: item?.metrics ?? [] }
}

export async function getDashboardMetrics(token: string) {
  const res = await api.get<DashboardResponse>('/functions/v1/dashboard-metrics', token)
  return normalizeMetrics(res)
}

export async function getOpsMetrics(token: string) {
  const res = await api.get<DashboardResponse>('/functions/v1/ops-metrics', token)
  return normalizeMetrics(res)
}
