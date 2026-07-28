import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api'
import type { NotificationListResponse } from '@/lib/types'

export const notificationKeys = {
  unreadCount: ['notifications', 'unread-count'] as const,
  list: (params: { page: number; limit: number; unreadOnly: boolean }) =>
    ['notifications', 'list', params] as const,
}

// Polls just the unread count for the header badge. refetchIntervalInBackground
// defaults to false, so this pauses while the tab isn't focused and resumes on
// return — no manual visibilitychange listener needed.
export function useNotificationsUnreadCount() {
  const { token } = useAuthStore()
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: () => getNotifications(token!, { limit: 1 }),
    enabled: !!token,
    refetchInterval: 3 * 60 * 1000,
    select: (res) => res.unread_count,
  })
}

// Full list — only meant to be enabled while the dropdown/page is actually open.
export function useNotificationsList(
  params: { page?: number; limit?: number; unreadOnly?: boolean; enabled?: boolean } = {}
) {
  const { token } = useAuthStore()
  const page = params.page ?? 1
  const limit = params.limit ?? 10
  const unreadOnly = params.unreadOnly ?? false
  return useQuery({
    queryKey: notificationKeys.list({ page, limit, unreadOnly }),
    queryFn: () => getNotifications(token!, { page, limit, unreadOnly }),
    enabled: !!token && (params.enabled ?? true),
  })
}

export function useMarkNotificationRead() {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(token!, notificationId),
    onMutate: async (notificationId: string) => {
      queryClient.setQueriesData<NotificationListResponse>(
        { queryKey: ['notifications', 'list'] },
        (old) => {
          if (!old) return old
          const target = old.data.find((n) => n.id === notificationId)
          if (!target || target.is_read) return old
          return {
            ...old,
            data: old.data.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
            unread_count: Math.max(0, old.unread_count - 1),
          }
        }
      )
      queryClient.setQueryData<number>(notificationKeys.unreadCount, (old) =>
        old ? Math.max(0, old - 1) : old
      )
    },
  })
}

export function useMarkAllNotificationsRead() {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllNotificationsRead(token!),
    onMutate: async () => {
      queryClient.setQueriesData<NotificationListResponse>(
        { queryKey: ['notifications', 'list'] },
        (old) => (old ? { ...old, data: old.data.map((n) => ({ ...n, is_read: true })), unread_count: 0 } : old)
      )
      queryClient.setQueryData(notificationKeys.unreadCount, 0)
    },
  })
}
