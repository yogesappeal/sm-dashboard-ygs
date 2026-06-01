import { api } from './fetcher'
import type { UserDetails, SmToolboxModel } from '../types'

export async function getUserDetails(token: string) {
  return api.get<{ data: UserDetails }>('/functions/v1/user', token)
}

export async function getSMToolbox(token: string) {
  return api.get<{ data: SmToolboxModel[] }>('/functions/v1/user-apps', token)
}
