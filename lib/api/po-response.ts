import type { PoResponseValidation, PoResponseActionResult, PoResponseLinkStatus } from '../types'

// ============================================================================
// Public PO response flow — no Supabase user session exists here (the
// supplier/subcontractor has no account), so this module does NOT reuse
// fetcher.ts's `api` helper (that one hard-requires a user Bearer token).
// Auth for these calls is the anon key only, same as any unauthenticated
// Supabase edge function call.
// ============================================================================

const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Local convenience for manual QA only: visiting a link with the literal
// token "test" swaps in whatever real token is currently set in
// NEXT_PUBLIC_PO_RESPONSE_TEST_TOKEN, so a fixed bookmarkable URL
// (/po-response/accept/test) keeps working as test tokens are rotated in
// .env.local — no effect on real emailed links, which never use this value.
function resolveToken(token: string): string {
  if (token.toLowerCase() === 'test' && process.env.NEXT_PUBLIC_PO_RESPONSE_TEST_TOKEN) {
    return process.env.NEXT_PUBLIC_PO_RESPONSE_TEST_TOKEN
  }
  return token
}

async function poResponseRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

// token_status values beyond 'valid' aren't fully documented yet — anything
// unrecognized is treated as 'invalid' rather than silently letting the
// visitor through to an action form.
function normalizeLinkStatus(status: string): PoResponseLinkStatus {
  const s = status?.toLowerCase()
  if (s === 'valid' || s === 'expired' || s === 'used') return s
  return 'invalid'
}

export async function validatePoResponseToken(token: string): Promise<PoResponseValidation> {
  const key = resolveToken(token)
  const q = new URLSearchParams({ key })
  const res = await poResponseRequest<{
    supplier_name: string
    type: 'supplier' | 'subcontractor'
    po_number: string
    scheduled_date: string
    po_status: string
    method: string
    token_status: string
    po_amount: number
    client_first_name: string
    client_last_name: string
    address: string
    order_details: { details: string }
    site_information: string
  }>(`/functions/v1/po-information?${q}`)

  return {
    linkStatus: normalizeLinkStatus(res.token_status),
    po: {
      supplier_name: res.supplier_name,
      type: res.type,
      po_number: res.po_number,
      scheduled_date: res.scheduled_date,
      po_status: res.po_status,
      method: res.method,
      po_amount: res.po_amount,
      client_first_name: res.client_first_name,
      client_last_name: res.client_last_name,
      address: res.address,
      order_details: res.order_details,
      site_information: res.site_information,
    },
  }
}

// po-supplier-confirmed expects "YYYY-MM-DD HH:mm:ss.SSS", not a bare date.
function toApiDateTime(date: string): string {
  return `${date} 00:00:00.000`
}

async function submitConfirmation(
  token: string,
  action: 'confirm' | 'reject',
  newDate: string,
  notes: string
): Promise<PoResponseActionResult> {
  return poResponseRequest<PoResponseActionResult>('/functions/v1/po-supplier-confirmed', {
    method: 'POST',
    body: JSON.stringify({
      key: resolveToken(token),
      new_date: toApiDateTime(newDate),
      action,
      notes,
    }),
  })
}

// Accept keeps the currently scheduled date — same endpoint as reschedule,
// just with the date unchanged.
export async function acceptPoResponse(token: string, currentScheduledDate: string): Promise<PoResponseActionResult> {
  return submitConfirmation(token, 'confirm', currentScheduledDate, '')
}

export async function rejectPoResponse(token: string, reason: string, currentScheduledDate: string): Promise<PoResponseActionResult> {
  return submitConfirmation(token, 'reject', currentScheduledDate, reason)
}

// Confirms immediately with the new date — there is no separate SM-approval
// step for this flow (confirmed via the real API: action "confirm" always
// returns status "PO Confirmed", even when the date changes).
export async function submitPoRescheduleRequest(token: string, newDate: string, reason: string): Promise<PoResponseActionResult> {
  return submitConfirmation(token, 'confirm', newDate, reason)
}
