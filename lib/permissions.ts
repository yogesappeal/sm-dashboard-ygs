import type { UserRole } from './store'

export type PermissionAction =
  | 'supplier:create'
  | 'supplier:edit'
  | 'scope:create'
  | 'scope:edit'
  | 'po:create'

// Flip any boolean to change what a role can do — this table is the only
// place permission rules live. Admin is spelled out in full (not "always
// true") so a future role can be added the same way without special-casing.
const PERMISSIONS: Record<Exclude<UserRole, null>, Record<PermissionAction, boolean>> = {
  Admin: {
    'supplier:create': true,
    'supplier:edit':   true,
    'scope:create':    true,
    'scope:edit':      true,
    'po:create':       true,
  },
  'Site Manager': {
    'supplier:create': false,
    'supplier:edit':   false,
    'scope:create':    false,
    'scope:edit':      false,
    'po:create':       true,
  },
  Operations: {
    'supplier:create': true,
    'supplier:edit':   true,
    'scope:create':    true,
    'scope:edit':      true,
    'po:create':       false,
  },
}

export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  if (!role) return false
  return PERMISSIONS[role][action]
}
