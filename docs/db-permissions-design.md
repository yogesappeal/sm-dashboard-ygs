# DB-Backed Permission Matrix — Design Proposal

Status: **Draft for discussion** — not yet implemented.

## Background

Permission checks currently live in [`lib/permissions.ts`](../lib/permissions.ts) as a hardcoded
matrix: a `PermissionAction` union type and a `Record<Role, Record<PermissionAction, boolean>>`
covering 3 roles (`Admin`, `Site Manager`, `Operations`) × 10 actions. Any change to who can do
what requires a code change and redeploy.

This doc proposes moving that matrix into the database so it can be edited without a deploy,
while keeping the frontend API (`hasPermission()`, `usePermission()`, `<PermissionGuard>`) stable.

## 1. Tables

### `permission_actions` — lookup of actions that can be gated

```sql
create table permission_actions (
  key         text primary key,        -- e.g. 'po:create', 'scope:edit'
  category    text not null,           -- e.g. 'Purchase Order', 'Scope', 'Contract' — for admin UI grouping
  label       text not null,           -- e.g. 'Create Purchase Order'
  description text,
  created_at  timestamptz not null default now()
);
```

A lookup table rather than a code enum, so new actions can be added via data without a type-level
migration.

### `roles` — role registry

```sql
create table roles (
  key         text primary key,   -- 'admin', 'site_manager', 'ops' — matches BackendUserRole
  label       text not null,      -- 'Admin', 'Site Manager', 'Operations'
  created_at  timestamptz not null default now()
);
```

### `role_permissions` — the actual matrix (role × action → boolean)

```sql
create table role_permissions (
  role_key    text not null references roles(key) on delete cascade,
  action_key  text not null references permission_actions(key) on delete cascade,
  allowed     boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id),
  primary key (role_key, action_key)
);
```

### `permission_audit_log` — change history (recommended, not strictly required)

```sql
create table permission_audit_log (
  id          bigint generated always as identity primary key,
  role_key    text not null,
  action_key  text not null,
  old_value   boolean,
  new_value   boolean not null,
  changed_by  uuid references auth.users(id),
  changed_at  timestamptz not null default now()
);
```

Populated via an `AFTER UPDATE` trigger on `role_permissions`, so it's captured regardless of
which client made the change.

## 2. Seed data

Migrate the existing matrix 1:1 so behavior doesn't change on cutover.

```sql
insert into roles (key, label) values
  ('admin', 'Admin'),
  ('site_manager', 'Site Manager'),
  ('ops', 'Operations');

insert into permission_actions (key, category, label) values
  ('supplier:create', 'Supplier', 'Create Supplier'),
  ('supplier:edit', 'Supplier', 'Edit Supplier'),
  ('supplier:status', 'Supplier', 'Change Supplier Status'),
  ('scope:create', 'Scope', 'Create Scope'),
  ('scope:edit', 'Scope', 'Edit Scope'),
  ('po:create', 'Purchase Order', 'Create PO'),
  ('po:edit', 'Purchase Order', 'Edit PO'),
  ('toolbox:view', 'Navigation', 'View SM Toolbox'),
  ('task:view', 'Navigation', 'View Tasks Menu'),
  ('contract:edit-planned-start', 'Contract', 'Edit Planned Start Date');

-- role_permissions: 30 rows (3 roles x 10 actions), values copied verbatim
-- from the PERMISSIONS table in lib/permissions.ts at time of migration.

insert into role_permissions (role_key, action_key, allowed) values
  -- admin
  ('admin', 'supplier:create', true),
  ('admin', 'supplier:edit', true),
  ('admin', 'supplier:status', true),
  ('admin', 'scope:create', true),
  ('admin', 'scope:edit', true),
  ('admin', 'po:create', true),
  ('admin', 'po:edit', true),
  ('admin', 'toolbox:view', false),
  ('admin', 'task:view', true),
  ('admin', 'contract:edit-planned-start', true),
  -- site_manager
  ('site_manager', 'supplier:create', false),
  ('site_manager', 'supplier:edit', false),
  ('site_manager', 'supplier:status', false),
  ('site_manager', 'scope:create', false),
  ('site_manager', 'scope:edit', false),
  ('site_manager', 'po:create', true),
  ('site_manager', 'po:edit', true),
  ('site_manager', 'toolbox:view', true),
  ('site_manager', 'task:view', true),
  ('site_manager', 'contract:edit-planned-start', true),
  -- ops
  ('ops', 'supplier:create', true),
  ('ops', 'supplier:edit', true),
  ('ops', 'supplier:status', true),
  ('ops', 'scope:create', true),
  ('ops', 'scope:edit', true),
  ('ops', 'po:create', false),
  ('ops', 'po:edit', false),
  ('ops', 'toolbox:view', false),
  ('ops', 'task:view', false),
  ('ops', 'contract:edit-planned-start', false);
```

Values above are copied verbatim from `lib/permissions.ts` as of this doc's writing — verify against
the file at migration time in case it's changed since.

## Appendix A — Where each permission is currently enforced in the frontend

Every `PermissionAction` defined in `lib/permissions.ts` is actively used somewhere in the
frontend (via `<PermissionGuard action="...">` or `usePermission('...')`). This is the full list,
so the backend/DB side knows exactly what each key gates and nothing gets seeded without a real
consumer.

| Action key | Category | Gates | Used in |
|---|---|---|---|
| `po:create` | Purchase Order | Showing the "Create PO" button/flow | `app/(dashboard)/purchase-orders/page.tsx`, `.../purchase-orders/supplier/new/page.tsx`, `.../purchase-orders/subcontractor/new/page.tsx`, `contract-preview/_components/right-panel.tsx` (scope-level quick-create + PO Tracker tab) |
| `po:edit` | Purchase Order | Editing an existing PO, and the "PO Plan Date" trade-date editor | `.../purchase-orders/supplier/[id]/page.tsx`, `.../purchase-orders/subcontractor/[id]/page.tsx`, `contract-preview/_components/center-panel.tsx` (PO detail Edit button), `contract-preview/_components/right-panel.tsx` (PO Plan Date toggle + conflict-banner date control) |
| `supplier:create` | Supplier | Showing "+ New Supplier" | `app/(dashboard)/suppliers/page.tsx` |
| `supplier:edit` | Supplier | "Edit" button on a supplier's detail slide-over | `components/cards/supplier-slide-over.tsx` |
| `supplier:status` | Supplier | Active/Inactive status toggle on a supplier | `components/cards/supplier-slide-over.tsx` |
| `scope:create` | Scope | Showing "+ New Scope" | `app/(dashboard)/scope/page.tsx` |
| `scope:edit` | Scope | "Edit" button on a scope's detail slide-over | `components/cards/scope-slide-over.tsx` |
| `toolbox:view` | Navigation | Showing the "SM Toolbox" icon/panel in the header | `components/layout/header.tsx` |
| `task:view` | Navigation | Access to the Tasks menu/page | `app/(dashboard)/tasks/page.tsx` |
| `contract:edit-planned-start` | Contract | Editing a contract's planned start date | `contract-preview/_components/contract-layout.tsx` |

No orphaned actions and no ungated usages found — the 10 keys above are a complete, accurate seed
list as of this writing.

## 3. Security (Supabase RLS)

- **SELECT** on `role_permissions`: a regular user may only read the row(s) for their own
  `role_key`, via an RPC (`get_my_permissions()`) that resolves role from `auth.uid()` → user
  profile → filters. The full matrix (all roles) is readable only by `admin`.
- **INSERT / UPDATE / DELETE** on `role_permissions`: `admin` only.
- `permission_actions` / `roles`: read for all authenticated users; write for `admin` only (if new
  actions should also be addable from an admin UI).

## 4. API surface

| Endpoint | Caller | Purpose |
|---|---|---|
| `GET /me/permissions` | any authenticated user | Resolved permissions for the caller's own role → `{ "po:create": true, ... }`. Called once on session load; never exposes the full matrix. |
| `GET /admin/permissions` | admin only | Full matrix across all roles, for a permissions settings screen |
| `PATCH /admin/permissions` | admin only | Body: `{ role_key, action_key, allowed }` — toggles one cell, triggers audit log |
| `GET /admin/permissions/audit` | admin only (optional) | Change history |

## 5. Frontend integration

- `hasPermission(role, action)` in `lib/permissions.ts` keeps its current signature; only its data
  source changes — from the static `PERMISSIONS` import to a fetched-and-cached matrix.
- Fetch `GET /me/permissions` once when auth resolves (React Query), store the result in
  `useAuthStore` alongside the existing `user`/`role` state.
- On fetch failure, **fail closed** (treat all actions as `false`) rather than fail-open, so a
  network hiccup can't silently expose a sensitive action.
- `usePermission()` and `<PermissionGuard>` don't need to change — they just read from whatever
  `hasPermission()` resolves to, so no refactor needed in the ~10 call sites already using this
  pattern (e.g. `contract-preview/_components/right-panel.tsx`, `center-panel.tsx`).

## Open questions for discussion

- Do we need custom/dynamic roles beyond the current fixed 3 (`admin`, `site_manager`, `ops`), or
  is the fixed-role + editable-matrix design (as above) sufficient for now?
- Is `permission_audit_log` worth building in v1, or can it be deferred until there's an actual
  admin UI to drive it?
- Should `GET /me/permissions` be folded into the existing login/session response instead of a
  separate call, to avoid an extra round trip on every session start?
