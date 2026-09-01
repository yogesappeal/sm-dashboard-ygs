import { billsApi } from './bills-fetcher'
import type {
  ApiActivities,
  ApiAttachment,
  ApiAuditLogEntry,
  ApiBill,
  ApiComment,
  AuditTrailEvent,
  Bill,
  BillFile,
  BillScope,
  MaybeWrapped,
} from '../types'

export const NO_DATA = 'No data'

// Most Bills endpoints wrap their payload in `{ data: ... }`; handles the
// bare-value case too since the exact convention isn't confirmed for every
// endpoint (see Resource/data-curl-api.md).
export function unwrapApiData<T>(json: MaybeWrapped<T>): T {
  if (json && typeof json === 'object' && 'data' in (json as Record<string, unknown>)) {
    return (json as { data: T }).data
  }
  return json as T
}

// `scope` selects which Bills view to fetch. Only `approved_by_me` is
// confirmed by Resource/data-curl-api.md; `pending` and `all` follow the
// same vocabulary per the product spec for the "Requires My Approval" /
// "All Bills" sidebar views.
export async function getBills(token: string, scope: BillScope) {
  return billsApi.get<MaybeWrapped<ApiBill[]>>(`/functions/v1/bills?scope=${scope}`, token)
}

export async function getBillDetail(token: string, billId: string) {
  return billsApi.get<MaybeWrapped<ApiBill>>(`/functions/v1/bills/${billId}?is_dummy=false`, token)
}

export async function getBillActivities(token: string, billId: string) {
  return billsApi.get<MaybeWrapped<ApiActivities>>(`/functions/v1/bills/${billId}/activities`, token)
}

export async function getBillAttachment(token: string, billId: string, attachmentId: string) {
  return billsApi.get<MaybeWrapped<ApiAttachment>>(
    `/functions/v1/bills/${billId}/attachments/${attachmentId}`,
    token
  )
}

// The API requires a `comment` field on both endpoints — collected from the
// optional comment box shown under Approve/Reject while a bill is still
// pending (see bills-workspace.tsx); sent empty when left blank rather than
// a fabricated value.
export async function approveBill(token: string, billId: string, comment = '') {
  return billsApi.post<unknown>(`/functions/v1/bills/${billId}/approve`, token, { comment })
}

export async function rejectBill(token: string, billId: string, comment = '') {
  return billsApi.post<unknown>(`/functions/v1/bills/${billId}/reject`, token, { comment })
}

// ---------------------------------------------------------------------------
// API → UI mappers. Every mapped field falls back to NO_DATA (or a safe
// empty value) rather than assuming the API provides it — see
// lib/types/bill.ts for which fields are confirmed vs. best-effort.
// ---------------------------------------------------------------------------

function formatApiDate(raw?: string | null): string {
  if (!raw) return NO_DATA
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return NO_DATA
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatApiDateTime(raw?: string | null): string {
  if (!raw) return NO_DATA
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return NO_DATA
  return d.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatCurrencyAmount(val: number, currencyCode?: string | null) {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: currencyCode || 'AUD' }).format(val)
  } catch {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val)
  }
}

// Xero's bill status vocabulary (AUTHORISED, SUBMITTED, DRAFT, PAID,
// VOIDED, ...) doesn't map 1:1 onto this app's Pending/Approved/Rejected —
// there's no native Xero concept of "rejected". Anything not explicitly
// paid or voided/deleted is treated as still awaiting a decision.
function mapExternalStatus(raw?: string | null): Bill['status'] {
  switch ((raw ?? '').toUpperCase()) {
    case 'PAID':
    case 'APPROVED':
      return 'Approved'
    case 'VOIDED':
    case 'DELETED':
    case 'REJECTED':
      return 'Rejected'
    default:
      return 'Pending Approval'
  }
}

// `decision` reflects our own approval-run outcome and can be ahead of
// `external_status` (e.g. Xero still says "SUBMITTED" after we've already
// approved it here) — so a present `decision` wins over external_status.
// `existingStatus` (from a prior mapping of the same bill, e.g. the list
// fetch) is the fallback when this response has neither — the bill detail
// endpoint isn't confirmed to echo `decision` back, so without this a
// correctly-"Approved" bill would flip to "Pending Approval" the moment its
// detail loads and `decision` is missing from that response.
function mapBillStatus(api: ApiBill, existingStatus?: Bill['status']): Bill['status'] {
  switch ((api.decision ?? '').toLowerCase()) {
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return existingStatus ?? mapExternalStatus(api.external_status)
  }
}

export function mapApiAttachmentToFile(a: ApiAttachment): BillFile {
  const mime = a.mime_type ?? ''
  const type: BillFile['type'] = mime === 'application/pdf' ? 'pdf' : mime.startsWith('image/') ? 'image' : 'other'
  return {
    id: a.id,
    name: a.file_name ?? NO_DATA,
    sizeMb: a.content_length != null ? Math.round((a.content_length / 1024 / 1024) * 100) / 100 : 0,
    type,
    // Bill detail only gives storage location, not a usable URL — resolved
    // lazily via getBillAttachment() when the user clicks Preview.
    url: a.url ?? '',
  }
}

// `existing` carries over anything this mapper can't derive from an
// ApiBill alone (approvers and auditTrail — neither is part of this API;
// auditTrail is populated separately from getBillActivities()).
export function mapApiBillToBill(api: ApiBill, existing?: Bill): Bill {
  return {
    id: api.id,
    billNumber: api.external_bill_number ?? api.reference ?? NO_DATA,
    supplierName: api.contact_name ?? NO_DATA,
    address: NO_DATA, // never provided by this API — would need a separate Contacts lookup by contact_id
    issueDate: formatApiDate(api.bill_date),
    dueDate: formatApiDate(api.due_date),
    amount: api.amount_total ?? 0,
    status: mapBillStatus(api, existing?.status),
    lineItems: (api.line_items ?? []).map((li) => ({
      id: li.id,
      description: li.description ?? NO_DATA,
      quantity: li.quantity ?? 0,
      unitPrice: li.unit_amount ?? 0,
      account: li.account_code ?? NO_DATA,
      tax: li.tax_amount != null ? formatCurrencyAmount(li.tax_amount, api.currency_code) : NO_DATA,
      amount: li.line_amount ?? 0,
    })),
    files: (api.attachments ?? []).map(mapApiAttachmentToFile),
    approvers: existing?.approvers ?? [], // not provided by this API
    auditTrail: existing?.auditTrail ?? [],
    reference: api.reference ?? existing?.reference,
    currencyCode: api.currency_code ?? existing?.currencyCode,
    externalStatus: api.external_status ?? existing?.externalStatus,
    approvalStage: api.stage ?? existing?.approvalStage,
    approvalStepName: api.step_name ?? existing?.approvalStepName,
    decision: api.decision ?? existing?.decision,
    decidedDate: api.decided_at ? formatApiDateTime(api.decided_at) : existing?.decidedDate,
  }
}

function mapApiCommentToAuditEvent(c: ApiComment): AuditTrailEvent {
  return {
    id: c.id,
    type: 'comment',
    title: NO_DATA, // unused for the 'comment' branch in the audit trail UI
    date: formatApiDateTime(c.created_at),
    user: c.author_user_id ?? undefined,
    notes: c.body ?? NO_DATA,
  }
}

// e.g. "BILL_STATUS_CHANGED" -> "Bill Status Changed"
function formatAuditAction(action?: string | null): string {
  if (!action) return NO_DATA
  return action
    .toLowerCase()
    .split('_')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

function readStringField(value: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = value?.[key]
  return typeof v === 'string' ? v : undefined
}

function mapApiAuditLogToAuditEvent(a: ApiAuditLogEntry): AuditTrailEvent {
  const before = readStringField(a.before_value, 'status')
  const after = readStringField(a.after_value, 'status')
  return {
    id: a.id,
    type: 'action',
    title: formatAuditAction(a.action),
    date: formatApiDateTime(a.created_at),
    user: a.actor_id ?? undefined,
    notes: before && after ? `${before} → ${after}` : undefined,
  }
}

// Comments and audit-log entries are separate lists in the API response —
// merged here into the single chronological feed the Audit Trail card
// renders, sorted oldest-first by raw timestamp (not the formatted date
// string, since formatting loses sort order).
export function mapApiActivitiesToAuditTrail(activities: ApiActivities): AuditTrailEvent[] {
  const commentEntries = (activities.comments ?? []).map((c) => ({
    raw: c.created_at,
    event: mapApiCommentToAuditEvent(c),
  }))
  const auditLogEntries = (activities.audit_log ?? []).map((a) => ({
    raw: a.created_at,
    event: mapApiAuditLogToAuditEvent(a),
  }))

  return [...commentEntries, ...auditLogEntries]
    .sort((x, y) => new Date(x.raw ?? 0).getTime() - new Date(y.raw ?? 0).getTime())
    .map((entry) => entry.event)
}
