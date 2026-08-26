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
  | 'task:view'
  | 'contract:edit-planned-start'
  | 'bill:edit'
  | 'bill:review'

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
    'task:view':       true,
    'contract:edit-planned-start': true,
    'bill:edit':       true,
    'bill:review':     true,
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
    'task:view':       true,
    'contract:edit-planned-start': true,
    // SM is approve/reject only — no editing, and no access to the pre-approval
    // review queue (On Review / Revision Requested bills or the submit action).
    'bill:edit':       false,
    'bill:review':     false,
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
    // Ops doesn't get the Tasks menu at all.
    'task:view':       false,
    'contract:edit-planned-start': false,
    'bill:edit':       true,
    'bill:review':     true,
  },
}

export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  if (!role) return false
  return PERMISSIONS[role][action]
}
