export interface Contract {
  raNumber: string
  clientFullName: string
  clientEmail: string
  clientMobile: string
  streetAddress: string
  suburb: string
  state: string
  builder: string
  contractValue: number
  status: string
  pif: string
  notes: string
  googleDriveUrl?: string
  plannedStart?: string
}

export interface Project {
  id: string
  projectName: string
}

export interface Crew {
  name: string
  role: string
  crewName: string
}

export interface Pod {
  sm: string
  pa: string
  pm: string
  am: string
}

export interface Trade {
  trade_id: string
  trade_name: string
  status: string
}

export interface Building {
  building_id: string
  building_name: string
  status: string
  trades: Trade[]
}

export interface Scope {
  scope_id: string
  scope_number: string
  scope_name: string
  order_status: string
  scope_details: Building[]
}

export interface PurchaseOrder {
  id: string
  po_number: string
  type: 'supplier' | 'subcontractor'
  status: string
  supplier_name: string
  amount?: number
  last_modified: string
}
