import type { Trades, Pagination } from './shared'

export interface ScopeTrade {
  trade_id: string
  trade_name: string
  planned_po_date?: string | null
}

export interface ScopeDetail {
  status: string
  trades: ScopeTrade[]
  building_id: string
  building_name: string
}

export interface ScopeData {
  scope_id: string
  scope_name: string
  scope_number: string
  type: string
  notes: string
  scope_details: ScopeDetail[]
  order_status: string
  builder: string
  client_ra_number: string
  client_full_name: string
  street_address: string
  total_count?: number
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
