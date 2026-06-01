import { api } from './fetcher'
import type { DashboardMetrics } from '../types'

export async function getDashboardMetrics(token: string) {
  return api.get<DashboardMetrics>('/functions/v1/dashboard-metrics', token)
}

export async function getOpsMetrics(token: string) {
  return api.get<DashboardMetrics>('/functions/v1/ops-metrics', token)
}
