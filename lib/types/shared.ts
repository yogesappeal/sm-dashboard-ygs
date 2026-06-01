export interface Metrics {
  name: string
  total: number
}

export interface DashboardMetrics {
  metrics: Metrics[]
  totalContracts: number
  activeContracts: number
}

export interface DashboardResponse {
  data: DashboardMetrics
  status: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Trades {
  id: string
  name: string
  isChecked: boolean
}

export interface Crew {
  id: string
  name: string
  role: string
  projectId: string
}

export interface AttachmentFiles {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedAt: string
}

export interface MaterialOrderList {
  id: string
  description: string
  quantity: number
  unit: string
  unitRate: number
  amount: number
}

export interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface EmailPreviewModel {
  to: string
  subject: string
  body: string
  attachments: AttachmentFiles[]
}

export interface SearchData {
  query: string
  results: unknown[]
}

export interface ApiResponse<T> {
  data: T
  error: string | null
  status: number
}
