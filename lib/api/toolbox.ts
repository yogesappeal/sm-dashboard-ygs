import { api } from './fetcher'
import type { ToolboxResponse } from '../types'

export async function getUserApps(token: string) {
  return api.get<ToolboxResponse>('/functions/v1/user-apps', token)
}
