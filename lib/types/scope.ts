import type { Trades, Pagination } from './shared'

export interface ScopeData {
  scopeId: string
  scopeName: string
  scopeNumber: string
  type: string
  notes: string
  scopeDetails: ScopeItem[]
  orderStatus: string
  builder: string
  clientRaNumber: string
  clientFullName: string
  streetAddress: string
}

export interface ScopeDataModel {
  data: ScopeData[]
  pagination: Pagination
}

export interface ScopeItem {
  id: string
  buildingName: string
  tradeItems: string
}

export interface Items {
  status: string
  trades: Trades[]
  buildingId: string
  buildingName: string
  isChecked: boolean
}

export interface SelectedScopeDetail {
  scopeId: string
  scopeName: string
  items: ScopeItem[]
}

export interface Scopes {
  data: ScopeData[]
  total: number
}
