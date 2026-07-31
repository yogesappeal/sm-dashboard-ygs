import type { UserRole } from './store'

export type PermissionAction =
  | 'supplier:create'
  | 'supplier:edit'
  | 'supplier:status'
  | 'scope:create'
  | 'scope:edit'
  | 'po:create'
  | 'po:edit'
  | 'toolbox:view'

// Flip any boolean to change what a role can do — this table is the only
// place permission rules live. Admin is spelled out in full (not "always
// true") so a future role can be added the same way without special-casing.
const PERMISSIONS: Record<Exclude<UserRole, null>, Record<PermissionAction, boolean>> = {
  Admin: {
    'supplier:create': true,
    'supplier:edit':   true,
    'supplier:status': true,
    'scope:create':    true,
    'scope:edit':      true,
    'po:create':       true,
    'po:edit':         true,
    // SM Toolbox is Site Manager-specific tooling, not a general permission —
    // deliberately not "all access" here even for Admin.
    'toolbox:view':    false,
  },
  'Site Manager': {
    'supplier:create': false,
    'supplier:edit':   false,
    'supplier:status': false,
    'scope:create':    false,
    'scope:edit':      false,
    'po:create':       true,
    'po:edit':         true,
    'toolbox:view':    true,
  },
  Operations: {
    'supplier:create': true,
    'supplier:edit':   true,
    'supplier:status': true,
    'scope:create':    true,
    'scope:edit':      true,
    'po:create':       false,
    'po:edit':         false,
    'toolbox:view':    false,
  },
}

export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  if (!role) return false
  return PERMISSIONS[role][action]
}
