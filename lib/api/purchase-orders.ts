import { api } from './fetcher'
import type { PurchaseOrderList, POSupplierInfo, POAttachment } from '../types'

export interface PODetail {
  id: string
  poNumber: string
  status: string
  type: string
  supplierName: string
  supplierEmail?: string
  supplierPhone?: string
  clientFirstName?: string
  clientLastName?: string
  address?: string
  scheduledDate?: string
  siteInformation?: string
  orderDetails?: string
  totalAmount?: number
  contractId?: string
  contractName?: string
  createdAt: string
  updatedAt: string
}

export async function getPODetails(token: string, poId: string) {
  const q = new URLSearchParams({ id: `eq.${poId}`, select: '*' })
  return api.get<PODetail[]>(
    `/rest/v1/purchase_order_details?${q}`,
    token
  )
}

interface GetPOParams {
  page?: number
  limit?: number
  order_dir?: 'ASC' | 'DESC'
  type?: string
  status?: string
  search?: string
}

export async function getPurchaseOrdersPaginated(
  token: string,
  params: GetPOParams = {}
) {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    order_dir: params.order_dir ?? 'DESC',
    ...(params.type   ? { type:   params.type   } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(params.search ? { search: params.search } : {}),
  })
  return api.get<PurchaseOrderList>(
    `/functions/v1/get-po-paginated?${q}`,
    token
  )
}

export async function getPOSupplierInformation(token: string, poId: string) {
  const q = new URLSearchParams({ po_id: poId })
  return api.get<POSupplierInfo>(`/functions/v1/po-information?${q}`, token)
}

export async function insertPurchaseOrder(token: string, body: unknown) {
  return api.post('/functions/v1/insert-purchase-order', token, body)
}

export async function insertPurchaseOrderSubcontractor(
  token: string,
  body: unknown
) {
  return api.post('/rest/v1/rpc/insert_purchase_order', token, body)
}

export async function insertSupplierOrSubs(token: string, body: unknown) {
  return api.post('/rest/v1/rpc/insert_po_supplier', token, body)
}

export async function updatePurchaseOrder(token: string, body: unknown) {
  return api.post('/functions/v1/update-purchase-order', token, body)
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

export async function respondNewDateRequest(token: string, body: unknown) {
  return api.post('/functions/v1/respond-new-date-request', token, body)
}

export async function autoSendEmailPurchaseOrder(
  token: string,
  poId: string
) {
  return api.post('/functions/v1/auto-po-send', token, { po_id: poId })
}

// Attachments
export async function uploadPOAttachment(token: string, formData: FormData) {
  return api.upload<POAttachment>(
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

export async function getPOAttachmentURL(token: string, attachmentId: string) {
  return api.get<{ url: string }>(
    `/functions/v1/po-attachments/${attachmentId}/url`,
    token
  )
}

export async function uploadPOAttachmentAlt(token: string, formData: FormData) {
  return api.upload<POAttachment>(
    '/functions/v1/upload-po-attachments',
    token,
    formData
  )
}
