'use client'

import type { ReactNode } from 'react'
import { usePermission } from '@/lib/hooks/use-permission'
import type { PermissionAction } from '@/lib/permissions'

// Hides `children` when the current role lacks `action`, per the single
// on/off matrix in lib/permissions.ts. Default fallback (null) covers "just
// hide the trigger button"; pass an explicit fallback for full-page blocks.
export function PermissionGuard({ action, children, fallback = null }: {
  action: PermissionAction
  children: ReactNode
  fallback?: ReactNode
}) {
  return usePermission(action) ? <>{children}</> : <>{fallback}</>
}
