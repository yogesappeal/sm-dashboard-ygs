export type BillStatus =
  | 'Bill On Review'
  | 'Pending Approval'
  | 'Bill Approved'
  | 'Bill Rejected'
  | 'Bill Paid'
  | 'On Hold'

export interface BillLineItem {
  id: string
  item_code: string
  description: string
  quantity: number
  unit_price: number
  account: string
  tax_rate: string
  sm_dept: string
  site_tag: string
  amount: number
}

export interface BillAuditEvent {
  id: string
  actor: string
  action: string
  timestamp: string
  channel?: string
}

export interface BillApprovalStep {
  id: string
  label: string
  status: 'completed' | 'active' | 'pending'
}

export interface BillFile {
  id: string
  name: string
  size_mb: number
  type: 'pdf' | 'image' | 'other'
}

export interface Bill {
  id: string
  number: string
  supplier: string
  company: string
  amount: number
  currency: string
  status: BillStatus
  date: string
  due_date: string
  reference: string
  account_number: string
  created_source: string
  po_match: string | null
  line_items: BillLineItem[]
  audit_trail: BillAuditEvent[]
  approval_workflow: BillApprovalStep[]
  approval_condition: string
  files: BillFile[]
}
