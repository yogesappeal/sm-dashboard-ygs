// GET /functions/v1/get-notifications — `type` is free-form on the backend
// (new trigger events just add a new value), so it's a union of known values
// widened with `string` rather than a closed enum.
export type NotificationType = 'po_rescheduled' | 'po_completed' | 'po_rejected' | (string & {})

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: NotificationType
  source_table: string | null
  source_id: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  data: NotificationItem[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  unread_count: number
}

export interface MarkNotificationReadResponse {
  success: boolean
}
