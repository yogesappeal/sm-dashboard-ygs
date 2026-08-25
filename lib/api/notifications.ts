import { api } from './fetcher'
import type {
  NotificationListResponse,
  MarkNotificationReadResponse,
} from '../types'

interface GetNotificationsParams {
  page?: number
  limit?: number
  unreadOnly?: boolean
}

export async function getNotifications(
  token: string,
  params: GetNotificationsParams = {}
) {
  const q = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 10),
    ...(params.unreadOnly ? { unread_only: 'true' } : {}),
  })
  return api.get<NotificationListResponse>(
    `/functions/v1/get-notifications?${q}`,
    token
  )
}

export async function markNotificationRead(token: string, notificationId: string) {
  return api.post<MarkNotificationReadResponse>(
    '/functions/v1/mark-notification-read',
    token,
    { notification_id: notificationId }
  )
}

export async function markAllNotificationsRead(token: string) {
  return api.post<MarkNotificationReadResponse>(
    '/functions/v1/mark-all-notifications-read',
    token,
    {}
  )
}
