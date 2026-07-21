import type { Pagination } from './shared'

export interface Contract {
  pif: string
  location: string
  builder: string
  client: string
  contractValue: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface ContractModel {
  data: DataContract[]
  pagination: Pagination
}

export interface DataContract {
  id: string
  project_name: string
  deposit_date: string
  total_contract_value: number
  street_address: string
  suburb: string
  sm_name: string
  project_status: string
  total_count?: number
}

export interface DataContracts {
  contracts: DataContract[]
  total: number
}

export interface DetailContracts {
  id: string
  raNumber: string
  clientFullName: string
  streetAddress: string
  suburb: string
  state: string
  builder: string
  contractValue: number
  status: string
  pif: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface DropdownContract {
  id: string
  label: string
}

// ─── Raw shape returned by GET /functions/v1/get-dropdown-contract-scope ─────

export interface ContractScopeDropdownItem {
  id: string
  client_ra_number: string
  full_name: string
  street_address: string
  dropdown_label: string
  has_scope: boolean
}

// ─── Raw shape returned by GET /functions/v1/contract-details ────────────────
// NOTE: this is the actual current API response — richer than DetailContracts
// above (which is stale / does not match runtime shape).

export interface ContractDetailsCrewItem {
  role: string
  crew_name: string
  user_name: string
  assignment_id: string
}

export interface ContractDetailsTrade {
  trade_id: string
  trade_name: string
}

export interface ContractDetailsScopeItem {
  status: string
  trades: ContractDetailsTrade[]
  building_id: string
  building_name: string
}

export interface ContractDetailsScope {
  id: string
  type: string
  items: ContractDetailsScopeItem[]
  notes: string
  order_status: string
  scoping_name: string
  scoping_number: string
}

export interface ContractDetailsContract {
  id: string
  pif: string
  state: string
  suburb: string
  builder: string
  sm_name: string
  created_at: string
  updated_at: string
  sm_user_id: string
  deal_stage_id: string
  project_status: string
  sm_on_contract: string
  street_address: string
  customer_folder_link: string
  project_manager: string
  client_last_name: string
  client_ra_number: string
  deposit_received: string
  finalised_client: boolean
  private_assessor: string
  client_first_name: string
  airtable_record_id: string
  client_email_address: string
  total_contract_value: number
  client_contact_mobile: string
  date_deposit_received: string
  primary_contact_record_id: string
  build_pay_client_record_id: string
  // NOTE: not present in the backend response yet — see updateProjectStartDate in lib/api/contracts.ts
  planned_start_date?: string | null
}

export interface ContractDetailsPO {
  id: string
  amount: number
  status: string
  po_number: string
  supplier_name: string
  scheduled_date: string
}

export interface ContractDetailsPOGroup {
  data: ContractDetailsPO[]
  total: number
}

// The project this contract-details response currently represents. A contract
// can span multiple projects; future fetches will be scoped by contract id + project id.
export interface ContractDetailsProject {
  id: string
  status: string | null
  start_date: string | null
  project_name: string
}

export interface ContractDetailsProjectListItem {
  id: string
  project_name: string
}

export interface ContractDetailsRaw {
  crew: ContractDetailsCrewItem[]
  scopes: ContractDetailsScope[]
  contract: ContractDetailsContract
  projects?: ContractDetailsProject
  project_list?: ContractDetailsProjectListItem[]
  po_summary: {
    supplier: ContractDetailsPOGroup
    subcontractor: ContractDetailsPOGroup
  }
}

export interface ContractDetailsEnvelope {
  success: boolean
  data: ContractDetailsRaw
}
