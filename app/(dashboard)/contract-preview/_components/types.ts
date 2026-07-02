export interface DummyContract {
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
  googleDriveUrl?: string
}

export interface DummyCrew {
  name: string
  role: string
}

export interface DummyPod {
  sm: string
  pa: string
  pm: string
  am: string
}

export interface DummyTrade {
  trade_id: string
  trade_name: string
  status: string
}

export interface DummyBuilding {
  building_id: string
  building_name: string
  status: string
  trades: DummyTrade[]
}

export interface DummyScope {
  scope_id: string
  scope_number: string
  scope_name: string
  order_status: string
  scope_details: DummyBuilding[]
}

export interface DummyPO {
  id: string
  po_number: string
  type: 'supplier' | 'subcontractor'
  status: string
  supplier_name: string
  amount?: number
}
