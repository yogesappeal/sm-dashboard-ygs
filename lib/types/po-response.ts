// ─── Public (no-login) PO response flow — supplier/subcontractor reaches ────
// these via an emailed magic-link token. See lib/api/po-response.ts for the
// real API (po-information / po-supplier-confirmed) that produces/consumes
// these shapes.

export type PoResponseAction = 'accept' | 'reschedule' | 'reject'

export type PoResponseLinkStatus = 'valid' | 'expired' | 'used' | 'invalid'

// Raw shape returned by GET /functions/v1/po-information?key=<token>
export interface PoResponsePo {
  supplier_name: string
  type: 'supplier' | 'subcontractor'
  po_number: string
  scheduled_date: string
  po_status: string
  method: string
  po_amount: number
  client_first_name: string
  client_last_name: string
  address: string
  // Free-text job/order details — a plain string with embedded newlines,
  // not HTML (unlike the SM-side rich-text job description).
  order_details: { details: string }
  site_information: string
}

export interface PoResponseValidation {
  linkStatus: PoResponseLinkStatus
  po: PoResponsePo | null
}

// Raw shape returned by POST /functions/v1/po-supplier-confirmed
export interface PoResponseActionResult {
  status: string
  scheduled_date: string
}
