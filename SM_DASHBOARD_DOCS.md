# SM Dashboard — Project Documentation

> Built with FlutterFlow + Flutter. This document covers architecture, data models, API layer, and migration notes for converting to Next.js.

---

## Source Code Paths

| Project | Path |
|---------|------|
| **Next.js (project ini)** | `/Users/andi/Downloads/sm_dashboard_web` |
| **Flutter source (referensi)** | `/Users/andi/Downloads/s_m_dashboard` |

### Quick Flutter source reference

```
/Users/andi/Downloads/s_m_dashboard/lib/
│
├── pages/                         ← Semua halaman app
│   ├── onboarding/                ← Auth: login, register, forgot, reset
│   ├── home_page/                 ← Dashboard (SM + Ops)
│   ├── contract/
│   │   ├── detail_page/           ← Contract detail (tabs)
│   │   └── detail_page_copy/      ← Ops contract detail variant
│   ├── purchaseorder/             ← PO list, forms, detail
│   ├── supplier/supplier_page/    ← Supplier list + management
│   ├── scope/                     ← Scope of work
│   └── task/                      ← Task management
│
├── components/                    ← Reusable widgets
│   ├── navigationbar/
│   │   ├── header_component/      ← Top bar
│   │   └── side_navigation/       ← Left sidebar
│   ├── card/                      ← All card widgets
│   │   ├── card_component/        ← Generic contract card
│   │   ├── card_crew_component/   ← Crew member card
│   │   └── card_vendor/           ← Vendor card
│   ├── form/
│   │   ├── supplier_form/         ← Create supplier
│   │   ├── supplier_update_form/  ← Edit supplier
│   │   ├── scope_form/            ← Create scope (multi-step)
│   │   └── scope_update_form/     ← Edit scope
│   ├── sidecomponents/            ← Side panel overlays
│   │   ├── supplier_details/      ← Supplier detail panel
│   │   └── scope_details/         ← Scope detail panel
│   ├── customelements/            ← Badges, status items
│   │   ├── item_status/           ← Status badge
│   │   └── scope_data_card/       ← Scope summary in contract detail
│   ├── shimmer/                   ← Loading skeletons
│   ├── table/
│   │   ├── label_table/           ← Generic data table
│   │   └── empty_data_element/    ← Empty state
│   └── customdialog/              ← Modal dialogs
│
├── backend/
│   ├── api_requests/
│   │   ├── api_calls.dart         ← SEMUA 43 API call classes (referensi utama)
│   │   └── api_manager.dart       ← HTTP client singleton
│   └── schema/structs/            ← Data model structs (semua ~43 structs)
│
├── app_state.dart                 ← Global state (FFAppState) — referensi Zustand
├── flutter_flow/
│   ├── custom_functions.dart      ← Helper functions (834 lines) — referensi utils
│   ├── flutter_flow_theme.dart    ← Design tokens — referensi CSS variables
│   └── nav/nav.dart               ← GoRouter config — referensi routing
│
└── actions/actions.dart           ← Reusable async operations

/Users/andi/Downloads/s_m_dashboard/assets/
└── environment_values/environment.json  ← Feature flags & config
```

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [Screens & Pages](#3-screens--pages)
4. [Data Models](#4-data-models)
5. [API Layer](#5-api-layer)
6. [State Management](#6-state-management)
7. [Navigation](#7-navigation)
8. [Authentication](#8-authentication)
9. [Components & Widgets](#9-components--widgets)
10. [Configuration & Environment](#10-configuration--environment)
11. [Next.js Migration Guide](#11-nextjs-migration-guide)

---

## 1. Overview

SM Dashboard is a project management web app for **AusHail**, targeting two user roles:

| Role | Access |
|------|--------|
| **Site Manager (SM)** | Contracts, POs, Scopes, Tasks |
| **Operations (Ops)** | Ops-specific metrics and contract views |

**Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)  
**Auth:** Email/password via Supabase Auth (JWT)  
**Platform targets:** Web (primary), iOS, Android

---

## 2. Project Structure

```
lib/
├── main.dart                    # App entry, Supabase init
├── app_state.dart               # Global state (FFAppState)
├── index.dart                   # Central page exports
├── environment_values.dart      # Environment config loader
├── app_constants.dart           # App-wide constants
│
├── auth/
│   └── supabase_auth/           # Auth manager, user streams
│
├── backend/
│   ├── api_requests/
│   │   ├── api_calls.dart       # All 43 API call classes
│   │   └── api_manager.dart     # HTTP client singleton
│   ├── schema/structs/          # 43 data model structs
│   └── supabase/                # Supabase client config
│
├── pages/
│   ├── onboarding/              # Auth screens
│   ├── home_page/               # Main dashboard
│   ├── contract/                # Contract detail
│   ├── purchaseorder/           # PO main + sub-pages
│   ├── supplier/                # Supplier management
│   ├── scope/                   # Scope of work
│   └── task/                    # Task management
│
├── components/                  # Reusable UI components
│   ├── navigationbar/           # Header + sidebar
│   ├── card/                    # All card widgets
│   ├── form/                    # Form components
│   ├── table/                   # Table components
│   ├── shimmer/                 # Loading skeletons
│   └── customdialog/            # Modal dialogs
│
├── flutter_flow/                # FlutterFlow utilities
│   ├── nav/nav.dart             # GoRouter config
│   ├── flutter_flow_theme.dart  # Design tokens
│   └── custom_functions.dart    # Helper functions (834 lines)
│
├── actions/actions.dart         # Reusable async operations
│
└── custom_code/
    └── widgets/                 # Custom Flutter widgets

assets/
├── images/
├── fonts/
├── jsons/
└── environment_values/
    └── environment.json         # Runtime config
```

---

## 3. Screens & Pages

### Onboarding (unauthenticated)

| Widget | Flutter file | Next.js equivalent |
|--------|-------------|-------------------|
| `SignInWidget` | `pages/onboarding/sign_in/` | `app/(auth)/login/page.tsx` |
| `RegisterWidget` | `pages/onboarding/register/` | `app/(auth)/register/page.tsx` |
| `ForgotPasswordWidget` | `pages/onboarding/forgot_password/` | `app/(auth)/forgot-password/page.tsx` |
| `ResetPasswordWidget` | `pages/onboarding/reset_password/` | `app/(auth)/reset-password/page.tsx` |

### Main App (authenticated)

| Widget | Flutter file | Next.js equivalent |
|--------|-------------|-------------------|
| `HomePageWidget` | `pages/home_page/` | `app/(dashboard)/page.tsx` |
| `DetailPageWidget` | `pages/contract/detail_page/` | `app/(dashboard)/contract/[id]/page.tsx` |
| `POMainPageWidget` | `pages/purchaseorder/` | `app/(dashboard)/purchase-orders/page.tsx` |
| `POSupplierFormWidget` | `pages/purchaseorder/po_supplier_form/` | `app/(dashboard)/purchase-orders/supplier/new/page.tsx` |
| `POSupplierDetailsPageWidget` | `pages/purchaseorder/po_supplier_details/` | `app/(dashboard)/purchase-orders/supplier/[id]/page.tsx` |
| `POSubsFormWidget` | `pages/purchaseorder/po_subs_form/` | `app/(dashboard)/purchase-orders/subcontractor/new/page.tsx` |
| `POSubsDetailsPageWidget` | `pages/purchaseorder/po_subs_details/` | `app/(dashboard)/purchase-orders/subcontractor/[id]/page.tsx` |
| `SupplierPageWidget` | `pages/supplier/supplier_page/` | `app/(dashboard)/suppliers/page.tsx` |
| `ScopeMainPageWidget` | `pages/scope/` | `app/(dashboard)/scope/page.tsx` |
| `TaskMainPageWidget` | `pages/task/` | `app/(dashboard)/tasks/page.tsx` |

---

## 4. Data Models

All structs live in `lib/backend/schema/structs/`. Each maps directly to a JSON response shape from the API.

### User

```dart
// Flutter: lib/backend/schema/structs/user_details_struct.dart
UserDetailsStruct {
  name, email, phone, jobTitle, imageUrl
}

// Next.js: lib/types/user.ts → UserDetails
```

### Contracts

```dart
// Flutter: lib/backend/schema/structs/contract_struct.dart
ContractStruct { pif, location, builder, client, contractValue, ... }
ContractModelStruct     // List response + pagination
DataContractsStruct     // Wrapper
DetailContractsStruct   // Full contract details
DropdownContractStruct  // id + label for dropdowns

// Next.js: lib/types/contract.ts
```

### Purchase Orders

```dart
// Flutter: lib/backend/schema/structs/p_o_data_struct.dart
PODataStruct { id, number, type, status, supplierName }
PurchaseOrderListStruct   // List + pagination
POSummaryStruct           // Summary KPIs
POSupplierInfoStruct      // Supplier info within PO
POVendorDataStruct        // Vendor/supplier details
POAttachmentStruct        // File attachment ref

// Next.js: lib/types/purchase-order.ts
```

### Scopes

```dart
// Flutter: lib/backend/schema/structs/scope_data_struct.dart
ScopeDataStruct { items[], projectDetails, ... }
ScopeItemStruct           // Single line item
ScopeDataModelStruct      // Wrapper
ScopesStruct              // List wrapper

// Next.js: lib/types/scope.ts
```

### Tasks

```dart
// Flutter: lib/backend/schema/structs/task_model_struct.dart
TaskModelStruct {
  title, description, dueDate, priority,
  assignee, status, category
}

// Next.js: lib/types/task.ts → TaskModel
```

### Suppliers

```dart
// Flutter: lib/backend/schema/structs/supplier_data_struct.dart
SupplierDataStruct { name, contact, address, type, status }
SupplierListStruct  // List wrapper

// Next.js: lib/types/supplier.ts
```

### Shared / Utilities

```dart
MetricsStruct             // Dashboard KPI counters
DashboardMetricsStruct    // Metrics response
PaginationStruct          // { page, total, limit }
TradesStruct              // Trade/work types
CrewStruct                // Crew member
AttachmentFilesStruct     // File attachment
MaterialOrderListStruct   // Material order items

// Next.js: lib/types/shared.ts
```

---

## 5. API Layer

All calls are in `lib/backend/api_requests/api_calls.dart`. Each is a class with a static `call()` method.

**Flutter Base URL:** `https://kgreehuvyspxzxvjergp.supabase.co` (old project)  
**Next.js Base URL:** set di `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` (new project)  
**Auth:** JWT from Supabase Auth, passed as Bearer token in headers.

### Dashboard

| Flutter class | Next.js function | Endpoint |
|--------------|-----------------|----------|
| `GetDashboardMetricsCall` | `getDashboardMetrics()` | `GET /functions/v1/get-dashboard-metrics` |
| `GetOpsMetricsCall` | `getOpsMetrics()` | `GET /functions/v1/get-ops-metrics` |

### Contracts

| Flutter class | Next.js function | Endpoint |
|--------------|-----------------|----------|
| `SearchContractCall` | `searchContract()` | `GET /functions/v1/search-contract` |
| `GetCrewPerProjectCall` | `getCrewPerProject()` | `GET /functions/v1/crew-list` |
| `GetClientsPaginatedCall` | `getClientsPaginated()` | `GET /functions/v1/get-clients-paginated` |
| `GetAllClientsPaginatedForOpsCall` | `getAllClientsPaginatedForOps()` | `GET /functions/v1/all-clients-paginated` |
| `GetContractDetailsCall` | `getContractDetails()` | `GET /functions/v1/contract-details` |

### Purchase Orders

| Flutter class | Next.js function | Endpoint |
|--------------|-----------------|----------|
| `GetPurchaseOrderPaginatedCall` | `getPurchaseOrdersPaginated()` | `GET /functions/v1/get-purchase-order-paginated` |
| `InsertPurchaseOrderCall` | `insertPurchaseOrder()` | `POST /functions/v1/insert-purchase-order` |
| `UpdatePurchaseOrderCall` | `updatePurchaseOrder()` | `POST /functions/v1/update-purchase-order` |
| `UpdatePurchaseOrderStatusCall` | `updatePurchaseOrderStatus()` | `POST /functions/v1/update-po-status` |
| `InsertPurchaseOrderSubcontractorCall` | `insertPurchaseOrderSubcontractor()` | `POST /functions/v1/insert-po-subcontractor` |
| `GetPOSupplierInformationCall` | `getPOSupplierInformation()` | `GET /functions/v1/get-po-supplier-info` |
| `AutoSendEmailPurchaseOrderCall` | `autoSendEmailPurchaseOrder()` | `POST /functions/v1/send-po-email` |
| — | `getPODetails()` | `GET /rest/v1/purchase_order_details` |

### Suppliers

| Flutter class | Next.js function | Endpoint |
|--------------|-----------------|----------|
| `GetSupplierPaginatedCall` | `getSuppliersPaginated()` | `GET /functions/v1/get-suppliers-paginated` |
| `InsertSupplierOrSubsCall` | `updateSupplierData()` | `POST /functions/v1/update-supplier` |
| `UpdateSupplierStatusCall` | `updateSupplierStatus()` | `POST /functions/v1/update-supplier-status` |
| `UpdateSupplierDataCall` | `updateSupplierData()` | `POST /functions/v1/update-supplier` |

### Scopes

| Flutter class | Next.js function | Endpoint |
|--------------|-----------------|----------|
| `GetScopingPaginatedCall` | `getScopingPaginated()` | `GET /functions/v1/get-scopes-paginated` |
| `GetScopeDetailByContractIdCall` | `getScopeDetailByContractId()` | `GET /functions/v1/get-scope-by-contract-id` |
| `GetScopeDetailByPOIDCall` | `getScopeDetailByPOId()` | `GET /functions/v1/get-scope-by-po-id` |
| `InsertScopeWithItemsNEWCall` | `insertScopeWithItems()` | `POST /functions/v1/insert-scopes-with-items` |

### Tasks

| Flutter class | Next.js function | Endpoint |
|--------------|-----------------|----------|
| `GetAllTasksCall` | `getAllTasks()` | `GET /functions/v1/tasks` |
| `InsertNewTaskCall` | `insertNewTask()` | `POST /functions/v1/insert-task` |
| `UpdateExistingTaskCall` | `updateExistingTask()` | `POST /functions/v1/update-task` |
| `UpdateTaskPriorityCall` | `updateTaskPriority()` | `POST /functions/v1/task-priority` |
| — | `updateTaskStatus()` | `POST /functions/v1/task-status` |

### Users / Other

| Flutter class | Next.js function | Endpoint |
|--------------|-----------------|----------|
| `GetUserDetailsCall` | `getUserDetails()` | `GET /functions/v1/get-user-details` |
| `GetSMToolboxCall` | `getSMToolbox()` | `GET /functions/v1/get-sm-toolbox` |

---

## 6. State Management

### Flutter: Global State (`FFAppState` — ChangeNotifier)

File: `lib/app_state.dart`

Key fields:
- `activeMenu` → Next.js: `useAppStore().activeMenu`
- `userProfile` / `userRole` → Next.js: `useAuthStore().user` / `.role`
- `taskList` / `taskCategories` → Next.js: `useTaskStore()`
- `scopeItems` → Next.js: `useScopeStore().draftItems`
- `toolboxItems` → Next.js: `useAppStore().toolboxItems`

### Next.js: Zustand Stores

| Store file | Replaces | Key state |
|-----------|---------|-----------|
| `lib/store/auth-store.ts` | `FFAppState.userProfile` + auth streams | `user`, `role`, `token`, `isLoading` |
| `lib/store/app-store.ts` | `FFAppState.activeMenu`, `appLoadingIndicator` | `activeMenu`, `sidebarOpen`, `mobileSidebarOpen` |
| `lib/store/task-store.ts` | `FFAppState.taskList` | `tasks`, `categories` |
| `lib/store/scope-store.ts` | `FFAppState.scopeItems` | `draftItems` (form state only) |

---

## 7. Navigation

### Flutter: GoRouter

File: `lib/flutter_flow/nav/nav.dart`

Route protection via `FFRoute` wrapper — redirects unauthenticated users to `/login`.

### Next.js equivalent

File: `proxy.ts` (root of project — Next.js 16 convention, NOT `middleware.ts`)

```
/           → app/(dashboard)/page.tsx         (protected)
/login      → app/(auth)/login/page.tsx
/register   → app/(auth)/register/page.tsx
/forgot-password → app/(auth)/forgot-password/page.tsx
/reset-password  → app/(auth)/reset-password/page.tsx
/purchase-orders → app/(dashboard)/purchase-orders/page.tsx (protected)
/suppliers       → app/(dashboard)/suppliers/page.tsx       (protected)
/scope           → app/(dashboard)/scope/page.tsx           (protected)
/tasks           → app/(dashboard)/tasks/page.tsx           (protected, feature flag)
/contract/[id]   → app/(dashboard)/contract/[id]/page.tsx  (protected)
```

---

## 8. Authentication

**Provider:** Supabase Auth (email/password)

### Flutter flow
1. User submits credentials → Supabase returns JWT
2. JWT stored in `_currentJwtToken` via stream listener
3. `AppStateNotifier.update(user)` triggers router redirect
4. JWT attached to every API call as `Authorization: Bearer <token>`

### Next.js equivalent
1. User submits via `app/(auth)/login/login-form.tsx`
2. `supabase.auth.signInWithPassword()` → JWT
3. `useAuthStore().setUser()` via `AuthProvider` on mount
4. Token passed explicitly to every API call from `useAuthStore().token`

---

## 9. Components & Widgets

### Flutter → Next.js mapping

| Flutter component | Flutter file | Next.js equivalent |
|------------------|-------------|-------------------|
| `HeaderComponentWidget` | `components/navigationbar/header_component/` | `components/layout/header.tsx` |
| `SideNavigationWidget` | `components/navigationbar/side_navigation/` | `components/layout/sidebar.tsx` |
| `CardPOItemWidget` | `components/card_p_o_item_widget.dart` | `components/cards/po-row.tsx` |
| `CardSupplierItemWidget` | `components/card_supplier_item_widget.dart` | `components/cards/supplier-row.tsx` |
| `CardScopeDataWidget` | `components/card_scope_data_widget.dart` | `components/cards/scope-row.tsx` |
| `CardTaskListItemWidget` | `components/card_task_list_item_widget.dart` | `components/cards/task-card.tsx` |
| `SupplierDetailsWidget` | `components/sidecomponents/supplier_details/` | `components/cards/supplier-slide-over.tsx` |
| `ScopeDetailsWidget` | `components/sidecomponents/scope_details/` | `components/cards/scope-slide-over.tsx` |
| `SupplierFormWidget` | `components/form/supplier_form/` | `components/forms/supplier-create-modal.tsx` |
| `ScopeFormWidget` | `components/form/scope_form/` | `components/forms/scope-create-modal.tsx` |
| `ItemStatusWidget` | `components/customelements/item_status/` | `components/ui/status-badge.tsx` |
| `EmptyDataElementWidget` | `components/table/empty_data_element/` | `components/ui/empty-state.tsx` |
| `InformationToastWidget` | `components/information_toast_widget.dart` | `components/shared/toast.tsx` + `useToast()` |
| `ItemListShimmerWidget` | `components/shimmer/item_list_shimmer/` | `components/ui/skeleton.tsx` |
| `LabelTableWidget` | `components/table/label_table/` | inline table headers per page |

---

## 10. Configuration & Environment

### Flutter: `assets/environment_values/environment.json`

```json
{
  "company": "AusHail",
  "supabaseUrl": "https://kgreehuvyspxzxvjergp.supabase.co",
  "roles": ["Site Manager", "Operations"],
  "features": {
    "home": true,
    "supplier": true,
    "purchaseOrder": true,
    "scope": true,
    "task": false
  },
  "attachmentFeature": false,
  "workspaceApps": true
}
```

### Next.js: `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://exlknzxmmqnehvximbyj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_COMPANY=AusHail
NEXT_PUBLIC_BASE_IMAGE_URL=https://exlknzxmmqnehvximbyj.supabase.co/storage/v1/object/public
NEXT_PUBLIC_PRIMARY_COLOR=#C66EEB

# Feature flags (mirrors environment.json)
NEXT_PUBLIC_FEATURE_TASK=true
NEXT_PUBLIC_FEATURE_ATTACHMENTS=false
NEXT_PUBLIC_FEATURE_WORKSPACE_APPS=true

# Roles
NEXT_PUBLIC_ROLE_SM=Site Manager
NEXT_PUBLIC_ROLE_OPS=Operations
```

---

## 11. Next.js Migration Guide

### Technology Mapping

| Flutter / FlutterFlow | Next.js (Implemented) |
|----------------------|----------------------|
| Supabase Flutter SDK | `@supabase/supabase-js` + `@supabase/ssr` |
| GoRouter + `requireAuth` | `proxy.ts` (Next.js 16) |
| `FFAppState` (ChangeNotifier) | Zustand stores |
| Page `*Model` classes | React component state / hooks |
| `FormFieldController` | `react-hook-form` + `zodResolver` |
| FlutterFlow theme tokens | Tailwind v4 CSS variables in `globals.css` |
| FlutterFlow shimmer | `<TableRowSkeleton>` / `<Skeleton>` |
| `responsiveVisibility()` | Tailwind responsive prefixes (`md:`, `lg:`) |
| `getJsonField()` / structs | TypeScript interfaces + Zod schemas |
| `ApiManager` singleton | `lib/api/fetcher.ts` + Tanstack Query |
| `custom_functions.dart` | `lib/utils/*.ts` |
| `InformationToastWidget` | `useToast()` hook |
| Try/catch + SnackBar | `<ErrorBoundary>` class component |
| Flutter Drawer (mobile sidebar) | CSS `translate-x` + Zustand `mobileSidebarOpen` |

### Page-by-Page Migration — Status

| Flutter page | Next.js page | Status |
|-------------|-------------|--------|
| `SignInWidget` | `app/(auth)/login/page.tsx` | ✅ Done |
| `RegisterWidget` | `app/(auth)/register/page.tsx` | ✅ Done |
| `ForgotPasswordWidget` | `app/(auth)/forgot-password/page.tsx` | ✅ Done |
| `ResetPasswordWidget` | `app/(auth)/reset-password/page.tsx` | ✅ Done |
| `HomePageWidget` | `app/(dashboard)/page.tsx` | ✅ Done |
| `DetailPageWidget` | `app/(dashboard)/contract/[id]/page.tsx` | ✅ Done |
| `POMainPageWidget` + forms | `app/(dashboard)/purchase-orders/` | ✅ Done |
| `SupplierPageWidget` | `app/(dashboard)/suppliers/page.tsx` | ✅ Done |
| `ScopeMainPageWidget` | `app/(dashboard)/scope/page.tsx` | ✅ Done |
| `TaskMainPageWidget` | `app/(dashboard)/tasks/page.tsx` | ✅ Done |

### Important Next.js 16 Gotchas

```typescript
// 1. middleware.ts → proxy.ts, function harus bernama proxy()
export function proxy(request: NextRequest) { ... }  // ✅
export function middleware(request: NextRequest) { ... }  // ❌ tidak jalan di Next.js 16

// 2. useSearchParams() harus dibungkus <Suspense>
<Suspense><ComponentThatUsesSearchParams /></Suspense>

// 3. params di dynamic routes bersifat Promise
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)  // harus di-unwrap dengan use()
}
```

---

*Generated from FlutterFlow source analysis — 2026-06-01*
*Flutter source: `/Users/andi/Downloads/s_m_dashboard`*
*Next.js project: `/Users/andi/Downloads/sm_dashboard_web`*
