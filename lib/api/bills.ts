import { api } from './fetcher'
import type {
  ApiAttachment,
  ApiAuditLogEntry,
  ApiBill,
  ApiComment,
  ApiLineItem,
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
  return api.get<MaybeWrapped<ApiBill[]>>(`/functions/v1/bills?scope=${scope}`, token)
}

export async function getBillDetail(token: string, billId: string) {
  return api.get<MaybeWrapped<ApiBill>>(`/functions/v1/bills/${billId}?is_dummy=false`, token)
}

export async function getBillComments(token: string, billId: string) {
  return api.get<MaybeWrapped<ApiComment[]>>(`/functions/v1/bills/${billId}/comments`, token)
}

export async function postBillComment(token: string, billId: string, body: string) {
  return api.post<unknown>(`/functions/v1/bills/${billId}/comments`, token, { body })
}

export async function getBillAuditLog(token: string, billId: string) {
  return api.get<MaybeWrapped<ApiAuditLogEntry[]>>(`/functions/v1/bills/${billId}/audit-log`, token)
}

export async function getBillAttachment(token: string, billId: string, attachmentId: string) {
  return api.get<MaybeWrapped<ApiAttachment>>(
    `/functions/v1/bills/${billId}/attachments/${attachmentId}`,
    token
  )
}

// The API requires a `comment` field on both endpoints — collected from the
// optional comment box shown under Approve/Reject while a bill is still
// pending (see bills-workspace.tsx); sent empty when left blank rather than
// a fabricated value.
export async function approveBill(token: string, billId: string, comment = '') {
  return api.post<unknown>(`/functions/v1/bills/${billId}/approve`, token, { comment })
}

export async function rejectBill(token: string, billId: string, comment = '') {
  return api.post<unknown>(`/functions/v1/bills/${billId}/reject`, token, { comment })
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
    url: a.signed_url ?? '',
  }
}

// tracking_category_name has been observed as both "SM Dept"/"Site Tag" and
// "SM/Dept"/"Site/Tag" across samples — normalized (strip spaces & slashes,
// lowercase) before matching so either form resolves correctly.
function findTrackingOptionName(tracking: ApiLineItem['tracking'], categoryKeyword: string): string {
  const match = (tracking ?? []).find((t) => {
    const normalized = (t.tracking_category_name ?? '').toLowerCase().replace(/[\s/]/g, '')
    return normalized.includes(categoryKeyword)
  })
  return match?.tracking_option_name ?? NO_DATA
}

// `existing` carries over anything this mapper can't derive from an
// ApiBill alone (approvers and auditTrail — neither is part of this API;
// auditTrail is populated separately from getBillComments()/getBillAuditLog()).
export function mapApiBillToBill(api: ApiBill, existing?: Bill): Bill {
  return {
    id: api.id,
    billNumber: api.external_bill_number ?? api.reference ?? NO_DATA,
    supplierName: api.contact?.name ?? NO_DATA,
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
      smDept: findTrackingOptionName(li.tracking, 'smdept'),
      siteTag: findTrackingOptionName(li.tracking, 'sitetag'),
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

// `authorId` is compared against the current user at render time (see
// bills-workspace.tsx) rather than resolved to `isMine` here — this data
// gets cached once fetched, and the current user can still be loading when
// that fetch first happens, so baking in a stale comparison would stick.
function mapApiCommentToAuditEvent(c: ApiComment): AuditTrailEvent {
  return {
    id: c.id,
    type: 'comment',
    title: NO_DATA, // unused for the 'comment' branch in the audit trail UI
    date: formatApiDateTime(c.created_at),
    user: c.author?.name ?? undefined,
    notes: c.body ?? NO_DATA,
    authorId: c.author?.id ?? undefined,
  }
}

// Shared by both the audit-log action title and each individual field
// label below — e.g. "BILL_STATUS_CHANGED" -> "Bill Status Changed",
// "due_date" -> "Due Date".
function humanizeSnakeCase(raw?: string | null): string {
  if (!raw) return NO_DATA
  return raw
    .toLowerCase()
    .split('_')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ')
}

// `before_value`/`after_value` are untyped — this stringifies whatever
// comes back reasonably (ISO-looking date strings get the same date
// formatting used elsewhere; everything else is printed as-is).
function stringifyAuditValue(v: unknown): string {
  if (v == null || v === '') return 'Not set'
  if (typeof v === 'string') {
    const asDate = new Date(v)
    return !Number.isNaN(asDate.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(v) ? formatApiDate(v) : v
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

// Only these fields are meaningful enough to a Site Manager reading the
// audit trail to show as a row — anything else in before_value/after_value
// (internal/technical fields we don't have a case for) is left out so the
// trail stays readable rather than listing every changed key.
const AUDIT_CHANGE_FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  decision: 'Decision',
  comment: 'Comment',
  workflow_status: 'Workflow Status',
  reference: 'Reference',
  due_date: 'Due Date',
  bill_date: 'Bill Date',
  supplier_contact: 'Supplier Contact',
  amount_total: 'Amount',
}

// Builds one row per allowlisted field present in either before/after —
// handles a single-field change (e.g. just `decision`) the same as several
// fields changed together (e.g. reference + due_date + supplier_contact
// edited at once).
function buildAuditChanges(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): AuditTrailEvent['changes'] {
  const changes: NonNullable<AuditTrailEvent['changes']> = []
  for (const [key, label] of Object.entries(AUDIT_CHANGE_FIELD_LABELS)) {
    if (!(before && key in before) && !(after && key in after)) continue
    const from = stringifyAuditValue(before?.[key])
    const to = stringifyAuditValue(after?.[key])
    if (from === to) continue
    changes.push({ label, from, to })
  }
  return changes.length > 0 ? changes : undefined
}

function readOptionalString(value: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const v = value?.[key]
  return typeof v === 'string' ? v : undefined
}

// `action` is often just a generic verb like "update" — not descriptive on
// its own — so when the diff includes a `decision` change, that's used to
// derive a clearer title instead (e.g. "approved" -> "Advanced to the next
// approval stage"), falling back to the raw action otherwise.
function deriveAuditTitle(a: ApiAuditLogEntry): string {
  const beforeDecision = readOptionalString(a.before_value, 'decision')
  const afterDecision = readOptionalString(a.after_value, 'decision')
  if (afterDecision && afterDecision !== beforeDecision) {
    switch (afterDecision.toLowerCase()) {
      case 'approved':
        return 'Advanced to the next approval stage'
      case 'rejected':
        return 'Bill rejected'
      default:
        return 'Decision updated'
    }
  }
  return humanizeSnakeCase(a.action)
}

function mapApiAuditLogToAuditEvent(a: ApiAuditLogEntry): AuditTrailEvent {
  return {
    id: a.id,
    type: 'action',
    title: deriveAuditTitle(a),
    date: formatApiDateTime(a.created_at),
    user: a.actor?.name ?? a.actor_id ?? undefined,
    changes: buildAuditChanges(a.before_value, a.after_value),
  }
}

// Comments (GET .../comments) and audit-log entries (GET .../audit-log) are
// two separate endpoints — merged here into the single chronological feed
// the Audit Trail card renders, sorted oldest-first by raw timestamp (not
// the formatted date string, since formatting loses sort order).
export function mapCommentsAndAuditLogToAuditTrail(
  comments: ApiComment[],
  auditLog: ApiAuditLogEntry[]
): AuditTrailEvent[] {
  const commentEntries = comments.map((c) => ({
    raw: c.created_at,
    event: mapApiCommentToAuditEvent(c),
  }))
  const auditLogEntries = auditLog.map((a) => ({
    raw: a.created_at,
    event: mapApiAuditLogToAuditEvent(a),
  }))

  return [...commentEntries, ...auditLogEntries]
    .sort((x, y) => new Date(x.raw ?? 0).getTime() - new Date(y.raw ?? 0).getTime())
    .map((entry) => entry.event)
}
