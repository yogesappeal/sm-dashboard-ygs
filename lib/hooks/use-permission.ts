import { useAuthStore } from '@/lib/store'
import { hasPermission, type PermissionAction } from '@/lib/permissions'

export function usePermission(action: PermissionAction): boolean {
  const { role } = useAuthStore()
  return hasPermission(role, action)
}
