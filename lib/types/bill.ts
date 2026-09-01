// ---------------------------------------------------------------------------
// Raw Bills API shapes — see Resource/data-curl-api.md. Only the Bill
// Detail response has a confirmed example (from a prior session); the
// List, Attachment, and Activities endpoints' exact shapes are
// unconfirmed, so every field here is optional and consumers should treat
// anything missing as absent rather than assume it exists.
// ---------------------------------------------------------------------------

export interface ApiTrackingEntry {
  tracking_option_id?: string | null
  tracking_category_id?: string | null
  tracking_option_name?: string | null
  tracking_category_name?: string | null
}

export interface ApiLineItem {
  id: string
  description?: string | null
  quantity?: number | null
  unit_amount?: number | null
  line_amount?: number | null
  tax_amount?: number | null
  account_code?: string | null
  tracking?: ApiTrackingEntry[]
}

export interface ApiAttachment {
  id: string
  file_name?: string | null
  mime_type?: string | null
  content_length?: number | null
  url?: string | null // only present (if at all) on the single-attachment endpoint, not on bill detail
}

export interface ApiBill {
  id: string
  contact_id?: string | null
  contact_name?: string | null
  external_bill_number?: string | null
  reference?: string | null
  external_status?: string | null
  bill_date?: string | null
  due_date?: string | null
  currency_code?: string | null
  amount_total?: number | null
  line_items?: ApiLineItem[]
  attachments?: ApiAttachment[]
  updated_at?: string | null
  // The bill's approval-run progress — `decision` reflects our own
  // approval workflow and can be ahead of `external_status` (which mirrors
  // Xero and may still say e.g. "SUBMITTED" after we've already approved
  // it), so `decision` takes priority when mapping to the UI's `status`.
  approval_run_id?: string | null
  stage?: number | null
  step_name?: string | null
  decision?: string | null
  decided_at?: string | null
}

// GET /bills/{id}/activities — confirmed shape (see lib/api/bills.ts).
// Comments and audit-log entries are two separate lists, not one unified
// feed, so they're mapped into AuditTrailEvent separately and merged.
export interface ApiApprovalRunRef {
  id: string
  attempt_number?: number | null
  status?: string | null
}

export interface ApiComment {
  id: string
  bill_id?: string | null
  approval_run_id?: ApiApprovalRunRef | null
  author_user_id?: string | null
  body?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ApiAuditLogEntry {
  id: string
  actor_id?: string | null
  action?: string | null
  target_type?: string | null
  target_id?: string | null
  bill_id?: string | null
  approval_run_id?: ApiApprovalRunRef | null
  before_value?: Record<string, unknown> | null
  after_value?: Record<string, unknown> | null
  created_at?: string | null
}

export interface ApiActivities {
  comments?: ApiComment[]
  audit_log?: ApiAuditLogEntry[]
}

// A GET response may wrap its payload in `{ data: ... }` or return it bare
// — both are handled by unwrapApiData in lib/api/bills.ts.
export type MaybeWrapped<T> = T | { data: T }

// The Bills views, driven by GET /bills?scope=<value> — see getBills in
// lib/api/bills.ts for which values are confirmed vs. per-spec.
export type BillScope = 'pending' | 'approved_by_me' | 'all'

// ---------------------------------------------------------------------------
// UI-facing shapes — what components/bills/bills-workspace.tsx renders.
// Unchanged from the original mock model so the existing UI/JSX didn't need
// restructuring; a few fields are additive (reference, currencyCode,
// externalStatus) since the API offers them and they're genuinely useful.
// ---------------------------------------------------------------------------

export interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  account: string
  tax: string
  amount: number
  // From line_items[].tracking[] — matched by tracking_category_name (see
  // mapApiLineItemToLineItem in lib/api/bills.ts), not guaranteed to be
  // present for every line item.
  smDept: string
  siteTag: string
}

export interface AuditTrailEvent {
  id: string
  type: 'system' | 'xero' | 'action' | 'comment'
  title: string
  subtitle?: string
  date: string
  user?: string
  userAvatar?: string
  notes?: string
  isMine?: boolean // comment authored by the current user — right-aligned bubble
}

export interface BillFile {
  id: string
  name: string
  sizeMb: number
  type: 'pdf' | 'image' | 'other'
  url: string
}

export interface Bill {
  id: string
  billNumber: string
  supplierName: string
  address: string
  issueDate: string
  dueDate: string
  amount: number
  status: 'Pending Approval' | 'Approved' | 'Rejected'
  lineItems: LineItem[]
  approvers: { name: string; role: string; avatar?: string }[]
  auditTrail: AuditTrailEvent[]
  files: BillFile[]
  // Additive fields the API provides that weren't in the original mock
  // model — shown alongside the existing fields, never replacing them.
  reference?: string
  currencyCode?: string
  externalStatus?: string
  approvalStage?: number
  approvalStepName?: string
  decision?: string
  decidedDate?: string
}
