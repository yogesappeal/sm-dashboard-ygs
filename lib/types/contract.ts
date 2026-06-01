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
