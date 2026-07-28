import { api } from './fetcher'
import type {
  PurchaseOrderList,
  POSupplierInfo,
  POAttachmentUploadEnvelope,
  PurchaseOrderDetailsEnvelope,
  InsertPurchaseOrderBody,
  InsertPurchaseOrderResponse,
  UpdatePurchaseOrderBody,
  UpdatePurchaseOrderResponse,
} from '../types'

// Full PO detail payload (order items, scope snapshot, supplier + client info)
// from the dedicated purchase-order-details function endpoint.
export async function getPurchaseOrderDetailsFull(token: string, poId: string) {
  const q = new URLSearchParams({ po_id: poId })
  const res = await api.get<PurchaseOrderDetailsEnvelope>(
    `/functions/v1/purchase-order-details?${q}`,
    token
  )
  return res.data
}

interface GetPOParams {
  page?: number
  limit?: number
  order_dir?: 'ASC' | 'DESC'
  type?: string
  status?: string
  search?: string
  contractId?: string
}

export async function getPurchaseOrdersPaginated(
  token: string,
  params: GetPOParams = {}
) {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    order_dir: params.order_dir ?? 'DESC',
    ...(params.type       ? { type:        params.type       } : {}),
    ...(params.status     ? { status:      params.status     } : {}),
    ...(params.search     ? { search:      params.search     } : {}),
    ...(params.contractId ? { contract_id: params.contractId } : {}),
  })
  return api.get<PurchaseOrderList>(
    `/functions/v1/get-po-paginated?${q}`,
    token
  )
}

// DUMMY — no backend endpoint returns a per-status PO count yet. Placeholder
// values only; swap the body for a real call once the endpoint exists (the
// caller in app/(dashboard)/purchase-orders/page.tsx doesn't need to change).
export async function getPurchaseOrderStatusSummary(_token: string): Promise<Record<string, number>> {
  return {
    'PO Draft': 4,
    'PO Submitted': 9,
    'PO Sent': 6,
    'PO Confirmed': 12,
    'PO Rescheduled': 2,
    'PO Completed': 31,
    'PO Rejected': 3,
    'PO Cancelled': 1,
  }
}

export async function getPOSupplierInformation(token: string, poId: string) {
  const q = new URLSearchParams({ po_id: poId })
  return api.get<POSupplierInfo>(`/functions/v1/po-information?${q}`, token)
}

// Unified endpoint for both supplier and subcontractor PO creation —
// distinguished by body.type / body.service_type. See InsertPurchaseOrderBody.
export async function insertPurchaseOrder(token: string, body: InsertPurchaseOrderBody) {
  return api.post<InsertPurchaseOrderResponse>('/functions/v1/insert-purchase-order', token, body)
}

export async function insertSupplierOrSubs(token: string, body: unknown) {
  return api.post('/rest/v1/rpc/insert_po_supplier', token, body)
}

export async function updatePurchaseOrder(token: string, body: UpdatePurchaseOrderBody) {
  return api.post<UpdatePurchaseOrderResponse>('/functions/v1/update-purchase-order', token, body)
}

export async function updatePurchaseOrderStatus(
  token: string,
  poId: string,
  status: string,
  reason?: string
) {
  return api.post('/rest/v1/rpc/update_po_status', token, {
    po_id: poId,
    status,
    ...(reason ? { reason } : {}),
  })
}

export async function updatePOSupplierInformation(token: string, body: unknown) {
  return api.post('/functions/v1/po-supplier-confirmed', token, body)
}

export interface RespondNewDateRequestBody {
  po_id: string
  action: 'approve' | 'decline'
}

export interface RespondNewDateRequestResponse {
  success: boolean
  message: string
  data: {
    po_id: string
    action: 'approve' | 'decline'
  }
}

export async function respondNewDateRequest(token: string, body: RespondNewDateRequestBody) {
  return api.post<RespondNewDateRequestResponse>('/functions/v1/respond-new-date-request', token, body)
}

export async function autoSendEmailPurchaseOrder(
  token: string,
  poId: string,
  serviceType: 'supplier' | 'subcontractor'
) {
  return api.post<{ message: string }>('/functions/v1/auto-po-send', token, {
    purchase_order_id: poId,
    service_type: serviceType,
  })
}

// Attachments — gated behind NEXT_PUBLIC_FEATURE_ATTACHMENTS, see po-attachments-section.tsx
// Must be uploaded BEFORE the PO is created: one file per call, returns an
// unlinked attachment id to pass into insert-purchase-order's attachment_ids.
export async function uploadPOAttachment(token: string, file: File, fileName?: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('file_name', fileName ?? file.name)
  return api.upload<POAttachmentUploadEnvelope>(
    '/functions/v1/po-attachments',
    token,
    formData
  )
}

export async function deletePOAttachment(
  token: string,
  attachmentId: string
) {
  return api.delete(`/functions/v1/po-attachments/${attachmentId}`, token)
}

// Response shape is unconfirmed — po-attachments has twice returned a
// different shape than documented (flat vs wrapped in {success, data}), so
// this accepts either and the caller extracts the url defensively.
export async function getPOAttachmentURL(token: string, attachmentId: string) {
  return api.get<{ url: string } | { success: boolean; data: { url: string } }>(
    `/functions/v1/po-attachments/${attachmentId}/url`,
    token
  )
}
