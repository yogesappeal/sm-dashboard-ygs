# SM Dashboard → Next.js Migration Plan

> Pendekatan: incremental, foundation dulu baru fitur. Setiap phase menghasilkan sesuatu yang bisa di-test dan di-deploy secara independen.

---

## Path Referensi

| Project | Path |
|---------|------|
| **Next.js (project ini)** | `/Users/andi/Downloads/sm_dashboard_web` |
| **Flutter source (referensi)** | `/Users/andi/Downloads/s_m_dashboard` |
| **Supabase project** | URL di `.env.local` |

### Flutter source structure (untuk referensi saat coding)

```
/Users/andi/Downloads/s_m_dashboard/
├── lib/
│   ├── pages/                         ← semua halaman Flutter
│   │   ├── home_page/                 ← Dashboard
│   │   ├── contract/detail_page/      ← Contract detail
│   │   ├── purchaseorder/             ← PO pages
│   │   ├── supplier/supplier_page/    ← Supplier page
│   │   ├── scope/                     ← Scope page
│   │   └── task/                      ← Task page
│   ├── components/                    ← Reusable widgets
│   │   ├── card/                      ← Card components
│   │   ├── form/                      ← Form components
│   │   ├── sidecomponents/            ← Side panels (slide-over)
│   │   ├── customelements/            ← Badges, status items
│   │   ├── shimmer/                   ← Loading skeletons
│   │   └── navigationbar/            ← Header + sidebar
│   ├── backend/
│   │   ├── api_requests/api_calls.dart ← Semua 43 API calls
│   │   └── schema/structs/            ← Data model structs
│   ├── app_state.dart                 ← Global state (FFAppState)
│   └── flutter_flow/
│       ├── custom_functions.dart      ← Helper functions
│       └── flutter_flow_theme.dart    ← Design tokens
└── assets/
    └── environment_values/environment.json ← Feature flags & config
```

---

## Status Progress

| Phase | Status | Tanggal |
|-------|--------|---------|
| Phase 1 — Foundation & Setup | ✅ **DONE** | 2026-06-01 |
| Phase 2 — Auth & Layout | ✅ **DONE** | 2026-06-01 |
| Phase 3 — Core Data Layer | ✅ **DONE** | 2026-06-01 |
| Phase 4 — Home / Dashboard | ✅ **DONE** | 2026-06-01 |
| Phase 5 — Purchase Orders | ✅ **DONE** | 2026-06-01 |
| Phase 6 — Suppliers | ✅ **DONE** | 2026-06-01 |
| Phase 7 — Scope of Work | ✅ **DONE** | 2026-06-01 |
| Phase 8 — Contract Detail | ✅ **DONE** | 2026-06-01 |
| Phase 9 — Tasks | ✅ **DONE** | 2026-06-01 |
| Phase 10 — Polish & Deploy | ✅ **DONE** (partial — deploy belum) | 2026-06-01 |

**Project Next.js ada di:** `/Users/andi/Downloads/sm_dashboard_web`
**Supabase:** project baru (URL sudah di-update di `.env.local`)

---

## Urutan Priority

```
Phase 1 → Foundation & Setup        ✅ DONE
Phase 2 → Auth & Layout             ✅ DONE
Phase 3 → Core Data Layer           ✅ DONE
Phase 4 → Home / Dashboard          ✅ DONE
Phase 5 → Purchase Orders           ✅ DONE
Phase 6 → Suppliers                 ✅ DONE
Phase 7 → Scope of Work             ✅ DONE
Phase 8 → Contract Detail           ✅ DONE
Phase 9 → Tasks                     ✅ DONE
Phase 10 → Polish & Deploy          ✅ DONE (deploy pending)
```

---

## Phase 1 — Foundation & Project Setup ✅ DONE

**Kenapa duluan:** Semua phase berikutnya bergantung pada ini.

### Checklist

- [x] Init Next.js **16** project dengan App Router + TypeScript
- [x] Setup Tailwind CSS (v4 — inline config via `@theme` di globals.css)
- [x] Install dependencies: Radix UI, React Hook Form, Zod (pengganti shadcn/ui manual)
- [x] Setup Supabase client (`@supabase/supabase-js` + `@supabase/ssr`)
- [x] Setup environment variables (`.env.local`) — Supabase URL baru sudah di-update
- [x] Setup Zustand untuk global state
- [x] Setup Tanstack Query untuk data fetching
- [x] Buat folder structure

### Catatan Implementasi

- Next.js **16** digunakan (bukan 14+) — ada breaking change: `middleware.ts` → `proxy.ts`, nama function harus `proxy` bukan `middleware`
- shadcn/ui **tidak** di-install via CLI — Radix UI primitives di-install manual, komponen ditulis sendiri. Ini lebih fleksibel untuk custom design
- Tailwind v4 sudah dipakai — konfigurasi theme via CSS variables di `globals.css`, bukan `tailwind.config.ts`
- Brand color `#C66EEB` sudah masuk ke CSS variables

### Folder Structure Final

```
sm_dashboard_web/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                              ✅
│   │   ├── login/page.tsx                          ✅
│   │   ├── login/login-form.tsx                    ✅
│   │   ├── register/page.tsx                       ✅
│   │   ├── forgot-password/page.tsx                ✅
│   │   └── reset-password/page.tsx                 ✅
│   ├── (dashboard)/
│   │   ├── layout.tsx                              ✅ (ErrorBoundary + responsive padding)
│   │   ├── page.tsx                                ✅ (SM + Ops view)
│   │   ├── contract/[id]/page.tsx                  ✅
│   │   ├── purchase-orders/page.tsx                ✅
│   │   ├── purchase-orders/supplier/[id]/page.tsx  ✅
│   │   ├── purchase-orders/supplier/new/page.tsx   ✅
│   │   ├── purchase-orders/subcontractor/[id]/page.tsx ✅
│   │   ├── purchase-orders/subcontractor/new/page.tsx  ✅
│   │   ├── suppliers/page.tsx                      ✅
│   │   ├── scope/page.tsx                          ✅
│   │   └── tasks/page.tsx                          ✅
│   ├── globals.css                                 ✅
│   └── layout.tsx                                  ✅
├── lib/
│   ├── supabase/client.ts                          ✅
│   ├── supabase/server.ts                          ✅
│   ├── api/                                        ✅ (lengkap)
│   ├── types/                                      ✅ (lengkap)
│   ├── utils/                                      ✅ (lengkap)
│   └── store/                                      ✅ (auth, app, task, scope)
├── components/
│   ├── layout/sidebar.tsx                          ✅ (desktop collapse + mobile drawer)
│   ├── layout/header.tsx                           ✅ (hamburger mobile)
│   ├── shared/providers.tsx                        ✅ (QueryClient + ToastProvider)
│   ├── shared/auth-provider.tsx                    ✅
│   ├── shared/toast.tsx                            ✅ (useToast hook)
│   ├── shared/error-boundary.tsx                   ✅
│   ├── shared/page-header.tsx                      ✅
│   ├── ui/status-badge.tsx                         ✅
│   ├── ui/empty-state.tsx                          ✅
│   ├── ui/pagination-bar.tsx                       ✅
│   ├── ui/skeleton.tsx                             ✅
│   ├── ui/confirm-dialog.tsx                       ✅
│   ├── cards/po-row.tsx                            ✅
│   ├── cards/supplier-row.tsx                      ✅
│   ├── cards/supplier-slide-over.tsx               ✅
│   ├── cards/scope-row.tsx                         ✅
│   ├── cards/scope-slide-over.tsx                  ✅
│   ├── cards/task-card.tsx                         ✅
│   ├── forms/supplier-create-modal.tsx             ✅
│   ├── forms/scope-create-modal.tsx                ✅
│   └── forms/task-create-edit-modal.tsx            ✅
├── proxy.ts                                        ✅ (auth middleware)
└── .env.local                                      ✅
```

---

## Phase 2 — Auth & Layout Shell ✅ DONE

### Flutter reference
- `lib/pages/onboarding/` — semua auth screens
- `lib/components/navigationbar/` — sidebar + header widgets
- `proxy.ts` menggantikan `FFRoute requireAuth` di GoRouter

### 2A — Authentication ✅

- [x] `proxy.ts` untuk route protection (pengganti `requireAuth` di GoRouter)
  - Unauthenticated → redirect ke `/login?redirectTo=...`
  - Authenticated di auth page → redirect ke `/`
- [x] Halaman Login — email/password dengan Supabase Auth + Zod validation
- [x] Halaman Register — dengan first/last name
- [x] Halaman Forgot Password — kirim reset email
- [x] Halaman Reset Password — update password baru
- [x] Auth store di Zustand (`user`, `role`, `token`, `isLoading`)
- [x] Auto-redirect sudah jalan via `proxy.ts`

### 2B — Dashboard Layout Shell ✅

- [x] `app/(dashboard)/layout.tsx` dengan `Sidebar` + `Header` + `ErrorBoundary`
- [x] `Sidebar` — collapsible (lebar/sempit) di desktop, drawer overlay di mobile
- [x] `Header` — greeting, role badge, avatar, sign out, hamburger button (mobile)
- [x] `AuthProvider` — load user details dari Supabase on mount, populate Zustand store
- [x] Mobile sidebar drawer (Phase 10)
- [ ] Role-based menu visibility (SM vs Ops) — belum diimplementasi
- [ ] Footer component — belum dibuat

### Catatan Implementasi

- Login page di-split jadi `page.tsx` (Server Component) + `login-form.tsx` (Client Component) karena `useSearchParams()` di Next.js 16 butuh Suspense boundary
- Auth design: dark gradient background `#1a1a2e` → sesuai dengan Flutter app yang dark sidebar
- Sidebar bisa di-collapse dengan tombol chevron di desktop; di mobile tampil sebagai drawer overlay

---

## Phase 3 — Core Data Layer ✅ DONE

### Flutter reference
- `lib/backend/schema/structs/` — semua data model structs
- `lib/backend/api_requests/api_calls.dart` — semua 43 API call classes
- `lib/flutter_flow/custom_functions.dart` — helper functions yang dimigrate ke `lib/utils/`

### 3A — TypeScript Types ✅

- [x] `lib/types/user.ts` — `UserDetails`, `SmToolboxModel`
- [x] `lib/types/contract.ts` — `Contract`, `ContractModel`, `DataContract`, `DetailContracts`, `DropdownContract`
- [x] `lib/types/purchase-order.ts` — `POData`, `PurchaseOrderList`, `POSummary`, `POFormValidation`, `POSupplierInfo`, `POVendorData`, `POAttachment`, `SupDataMapping`, `SubsDataMapping`, `MaterialItem`
- [x] `lib/types/scope.ts` — `ScopeData`, `ScopeDataModel`, `ScopeItem`, `Items`, `SelectedScopeDetail`, `Scopes`
- [x] `lib/types/task.ts` — `TaskModel`, `TaskCategory`
- [x] `lib/types/supplier.ts` — `SupplierData`, `SupplierList`
- [x] `lib/types/shared.ts` — `Metrics`, `DashboardMetrics`, `Pagination`, `Trades`, `Crew`, `AttachmentFiles`, `MaterialOrderList`, `Meta`, `EmailPreviewModel`, `SearchData`, `ApiResponse<T>`
- [x] `lib/types/index.ts` — re-export semua

### 3B — API Service Layer ✅

- [x] `lib/api/fetcher.ts` — shared HTTP client dengan `ApiError`, support GET/POST/PATCH/DELETE/upload
- [x] `lib/api/dashboard.ts` — `getDashboardMetrics`, `getOpsMetrics`
- [x] `lib/api/contracts.ts` — `getClientsPaginated`, `getAllClientsPaginatedForOps`, `searchContract`, `getContractDetails`, `getCrewPerProject`
- [x] `lib/api/purchase-orders.ts` — semua PO endpoints (create, update, status, subcontractor, supplier info, email, attachments) + `getPODetails`
- [x] `lib/api/suppliers.ts` — `getSuppliersPaginated`, `updateSupplierStatus`, `updateSupplierData`
- [x] `lib/api/scope.ts` — `getScopingPaginated`, `getScopeDetailByContractId`, `getScopeDetailByPOId`, `insertScopeWithItems`
- [x] `lib/api/tasks.ts` — `getAllTasks`, `insertNewTask`, `updateExistingTask`, `updateTaskPriority`, `updateTaskStatus`
- [x] `lib/api/users.ts` — `getUserDetails`, `getSMToolbox`
- [x] `lib/api/index.ts` — re-export semua

### 3C — Utility Functions ✅

- [x] `lib/utils/cn.ts` — `cn()` helper (clsx + tailwind-merge)
- [x] `lib/utils/date.ts` — `formatDate()`, `formatDateTime()`, `relativeTime()`, `getGreeting()`
- [x] `lib/utils/format.ts` — `formatCurrency()`, `formatNumber()`, `formatTradesList()`, `truncate()`, `initials()`, `capitalise()`
- [x] `lib/utils/validation.ts` — Zod schemas (login, register, forgot, reset, supplier, task) + `validatePOSupplierForm()`, `validatePOSubsForm()`
- [x] `lib/utils/scope.ts` — `generateScopeItem()`, `parseScopeItems()`, `mapBuildingTrades()`
- [x] `lib/utils/tasks.ts` — `buildTaskRequestBody()`, `formatTaskLog()`, `groupTasksByStatus()`

### 3D — Zustand Stores ✅

- [x] `lib/store/auth-store.ts` — `user`, `role`, `token`, `isLoading`
- [x] `lib/store/app-store.ts` — `activeMenu`, `sidebarOpen`, `mobileSidebarOpen`, `toolboxItems`
- [x] `lib/store/task-store.ts` — `tasks`, `categories`, add/update task
- [x] `lib/store/scope-store.ts` — `draftItems`, add/update/remove/clear draft scope items

---

## Phase 4 — Home / Dashboard Page ✅ DONE

### Flutter reference
- `lib/pages/home_page/home_page_widget.dart` — SM + Ops view logic
- `lib/components/card/card_ops_widget.dart` — Ops metric card
- `lib/components/card/card_performance_widget.dart` — SM metric card

### Komponen yang dibuat

- [x] Dashboard page (`app/(dashboard)/page.tsx`) — role-based UI, real API calls
- [x] Role-based view: SM view vs Ops view (kondisi berdasarkan `useAuthStore().role`)
- [x] `MetricCard` + `OpsMetricCard` — clickable KPI cards, filter contract list
- [x] `ContractRow` + `ContractTableHeader` — contract table rows (link ke contract detail)
- [x] `MetricsSkeleton` / `TableRowSkeleton` — loading skeletons
- [x] `WelcomeCard` — greeting card untuk SM & Ops
- [x] `PageHeader` shared component — `components/shared/page-header.tsx`
- [x] `EmptyState` shared component — `components/ui/empty-state.tsx`
- [x] `PaginationBar` shared component — `components/ui/pagination-bar.tsx`
- [x] `StatusBadge` shared component — `components/ui/status-badge.tsx`
- [x] `Skeleton` utilities — `components/ui/skeleton.tsx`

### Catatan Implementasi

- SM view: WelcomeCard + 3 MetricCard (Deposit, Pending, Active) — klik card filter contract list
- Ops view: WelcomeCard + OpsMetricCard (Scope count → link /scope, Supplier count → link /suppliers)
- Metrics index: `[1]`=Deposit, `[2]`=Preparation/Pending, `[3]`=Active untuk SM; `[0]`=Scope, `[1]`=Supplier untuk Ops
- Pagination: dropdown page selector + refresh button
- Status filter reset ke page 1 saat filter berubah
- Klik filter yang sudah aktif → reset ke All (toggle behavior)

---

## Phase 5 — Purchase Orders ✅ DONE

### Flutter reference
- `lib/pages/purchaseorder/` — semua PO pages
- `lib/components/card/card_p_o_item_widget.dart` — PO list card
- `lib/components/form/` — `supplier_form_widget.dart`, subs form
- `lib/components/sidecomponents/` — detail side panels

### Komponen yang dibuat

- [x] `app/(dashboard)/purchase-orders/page.tsx` — PO list + filter type/status + dropdown "New PO"
- [x] `app/(dashboard)/purchase-orders/supplier/[id]/page.tsx` — Supplier PO detail
- [x] `app/(dashboard)/purchase-orders/supplier/new/page.tsx` — Supplier PO form (create)
- [x] `app/(dashboard)/purchase-orders/subcontractor/[id]/page.tsx` — Subs PO detail
- [x] `app/(dashboard)/purchase-orders/subcontractor/new/page.tsx` — Subs PO form (create)
- [x] `components/cards/po-row.tsx` — PORow + POTableHeader
- [x] `components/ui/confirm-dialog.tsx` — ConfirmDialog (Accept/Reject/Send)

### Fitur yang diimplementasi

- PO list: tabel dengan pagination, filter by type (Supplier/Subcontractor/All) + filter by status
- Dropdown "New PO" → pilih Supplier PO atau Subcontractor PO
- Supplier form: contract dropdown, supplier dropdown, delivery date, site info, dynamic material table (add/remove rows, auto-calculate amount)
- Subs form: contract dropdown, subcontractor dropdown, delivery date, total price, site info, job details
- Draft vs Submit (status `PO Draft` / `PO Submitted`)
- Detail page: info card + supplier/client panel, action buttons berdasarkan status
- Accept/Reject dengan ConfirmDialog (reject butuh alasan)
- Send PO email via `autoSendEmailPurchaseOrder`
- Status badge warna: PO Sent (green), PO Draft (yellow), PO Rejected/Cancelled (red), PO Submitted (blue)

### Yang belum diimplementasi (deprioritized)

- [ ] Attachment upload/download (`NEXT_PUBLIC_FEATURE_ATTACHMENTS=true`)
- [ ] Scope items selector di form PO

### Catatan Implementasi

- `useSearchParams()` di form page harus dibungkus `<Suspense>` (Next.js 16)
- Detail page query langsung ke `/rest/v1/purchase_order_details` Supabase view
- `getPODetails` mengembalikan array — ambil `[0]` untuk single record

---

## Phase 6 — Suppliers ✅ DONE

### Flutter reference
- `lib/pages/supplier/supplier_page/supplier_page_widget.dart` — supplier page
- `lib/components/card_supplier_item_widget.dart` — supplier list card
- `lib/components/sidecomponents/supplier_details/supplier_details_widget.dart` — side panel detail
- `lib/components/form/supplier_form/supplier_form_widget.dart` — create form
- `lib/components/form/supplier_update_form/` — edit form

### Komponen yang dibuat

- [x] `app/(dashboard)/suppliers/page.tsx` — list dengan search debounce + filter type/status + pagination
- [x] `components/cards/supplier-row.tsx` — SupplierRow + SupplierTableHeader
- [x] `components/cards/supplier-slide-over.tsx` — side panel kanan (detail + edit + status toggle)
- [x] `components/forms/supplier-create-modal.tsx` — modal tambah supplier baru

### Fitur yang diimplementasi

- Search dengan debounce 400ms (name, code, company)
- Filter by type (All / Supplier / Subcontractor)
- Filter by status (All Status / Active / Inactive)
- Klik baris → slide-over panel dari kanan (animasi, mirip Flutter design)
- Edit supplier di dalam slide-over (react-hook-form + Zod)
- Toggle status Active Supplier ↔ Inactive
- Tambah supplier baru via modal
- Invalidate Tanstack Query cache setelah mutasi

---

## Phase 7 — Scope of Work ✅ DONE

### Flutter reference
- `lib/components/card_scope_data_widget.dart` — scope list card
- `lib/components/sidecomponents/scope_details/` — side panel detail
- `lib/components/form/scope_form/scope_form_widget.dart` — create form (multi-step wizard)
- `lib/components/form/scope_update_form/` — edit form
- `lib/backend/schema/structs/scope_data_struct.dart` — data model

### Komponen yang dibuat

- [x] `app/(dashboard)/scope/page.tsx` — list dengan filter type + pagination
- [x] `components/cards/scope-row.tsx` — ScopeRow + ScopeTableHeader
- [x] `components/cards/scope-slide-over.tsx` — side panel detail: scope items per building/trade
- [x] `components/forms/scope-create-modal.tsx` — modal create scope (contract dropdown, type, dynamic building/trade rows)
- [x] `lib/store/scope-store.ts` — Zustand store untuk draft scope items

### Fitur yang diimplementasi

- Filter by type (All / Supplier / Subcontractor / Both) — dilakukan client-side
- Klik baris → slide-over panel dengan detail scope items
- Create scope: pilih contract dari dropdown, pilih type, tambah/hapus building rows secara dinamis
- Zustand store menyimpan draft items selama form terbuka

---

## Phase 8 — Contract Detail ✅ DONE

### Flutter reference
- `lib/pages/contract/detail_page/detail_page_widget.dart` — contract detail page (tabs: info, crew, POs, scopes)
- `lib/components/card/card_crew_component/` — crew card
- `lib/components/customelements/scope_data_card/` — scope summary card

### Komponen yang dibuat

- [x] `app/(dashboard)/contract/[id]/page.tsx` — halaman detail contract

### Fitur yang diimplementasi

- Info card: PIF, client, builder, contract value (formatted currency), full address, notes, created/updated date
- Status badge di header
- Crew list per project (dari `getCrewPerProject`)
- Related scopes (dari `getScopingPaginated` with `contractId`)
- Related POs (dari `getPurchaseOrdersPaginated` with `contractId`) — clickable link ke PO detail
- Loading skeleton per section
- Back button (`router.back()`)

### Catatan Implementasi

- 4 parallel queries: contract detail + crew + POs + scopes
- `params` di Next.js 16 App Router bersifat `Promise` — harus di-`use()` di client component

---

## Phase 9 — Tasks ✅ DONE

### Flutter reference
- `lib/pages/task/` — task page
- `lib/components/card_task_list_item_widget.dart` — task card (checkbox, priority, category, due date)
- `lib/components/customelements/task_notification_card/` — task notification
- `assets/environment_values/environment.json` → `"task": false` (feature flag)

### Komponen yang dibuat

- [x] `app/(dashboard)/tasks/page.tsx` — list grouped by status, filter, feature flag guard
- [x] `components/cards/task-card.tsx` — card dengan checkbox status cycle + priority star + optimistic updates
- [x] `components/forms/task-create-edit-modal.tsx` — satu modal untuk create dan edit

### Fitur yang diimplementasi

- Feature flag guard: tampil "Tasks disabled" jika `NEXT_PUBLIC_FEATURE_TASK=false`
- `NEXT_PUBLIC_FEATURE_TASK=true` sudah di-set di `.env.local`
- Tasks grouped by status saat "All" dipilih (Pending / In Progress / Completed)
- Filter by status + toggle "Priority only"
- Checkbox mengcycle status: pending → in_progress → completed → pending
- Priority star toggle (optimistic update)
- Edit task dengan modal yang sama (pre-filled fields)
- Sidebar nav item "Tasks" muncul otomatis saat feature flag aktif

---

## Phase 10 — Polish & Deploy ✅ DONE (deploy pending)

### Flutter reference
- `lib/components/information_toast_widget.dart` → diganti `useToast()` hook
- `lib/components/shimmer/` → diganti `<TableRowSkeleton>`
- `lib/components/table/empty_data_element_widget.dart` → diganti `<EmptyState>`

### UX & Consistency ✅

- [x] Toast notifications — `components/shared/toast.tsx` + `useToast()` hook, auto-dismiss 4s, tipe success/error/info
- [x] Global error boundary — `components/shared/error-boundary.tsx`, class component dengan "Try again" button
- [x] Empty states konsisten di semua list page (via `<EmptyState>` component)
- [x] Loading skeletons konsisten (via `<TableRowSkeleton>` + page-level skeleton)
- [x] Mobile sidebar drawer — overlay dari kiri, backdrop click untuk tutup
- [x] Hamburger button di header (mobile only, `md:hidden`)
- [x] Responsive padding di main content (`p-4 md:p-6`)
- [x] `slideInRight` CSS animation untuk toast

### Yang belum diimplementasi

- [ ] Image optimization dengan `next/image`
- [ ] Tanstack Query cache tuning lanjutan
- [ ] Route prefetching
- [ ] RLS (Row Level Security) di Supabase — audit per tabel
- [ ] Role guard di server-side (Server Components)
- [ ] Attachment upload/download (`NEXT_PUBLIC_FEATURE_ATTACHMENTS=true`)

### Deploy ke Vercel (belum)

- [ ] Push ke GitHub repository
- [ ] Connect ke Vercel
- [ ] Set environment variables di Vercel dashboard
- [ ] Domain + SSL
- [ ] Smoke test semua role (SM + Ops)

---

## Komponen Shared — Status Final

| Komponen | Status | Dipakai di |
|----------|--------|-----------|
| `<PageHeader>` | ✅ Done | Semua dashboard page |
| `<StatusBadge>` | ✅ Done | PO, Supplier, Scope, Task, Contract |
| `<ConfirmDialog>` | ✅ Done | PO reject/accept/send |
| `<EmptyState>` | ✅ Done | Semua list page |
| `<TableRowSkeleton>` | ✅ Done | Semua data fetch |
| `<PaginationBar>` | ✅ Done | Semua list page |
| `<Toast>` / `useToast()` | ✅ Done | Global (Phase 10) |
| `<ErrorBoundary>` | ✅ Done | Dashboard layout |
| `<SearchInput>` (inline) | ✅ Done | Suppliers page |
| `<SlideOver>` (Supplier, Scope) | ✅ Done | Suppliers, Scope |
| `<FileUpload>` | ⏳ Belum | PO attachment (feature flag off) |

---

## Ringkasan Prioritas — Final

| # | Phase | Status | Catatan |
|---|-------|--------|---------|
| 1 | Foundation | ✅ DONE | — |
| 2 | Auth + Layout | ✅ DONE | Mobile sidebar ditambah di Phase 10 |
| 3 | Data Layer | ✅ DONE | — |
| 4 | Dashboard/Home | ✅ DONE | — |
| 5 | Purchase Orders | ✅ DONE | Fitur paling kompleks |
| 6 | Suppliers | ✅ DONE | Slide-over panel |
| 7 | Scope | ✅ DONE | Dynamic scope items |
| 8 | Contract Detail | ✅ DONE | 4 parallel queries |
| 9 | Tasks | ✅ DONE | Feature flag aktif |
| 10 | Polish + Deploy | ✅ DONE* | *Deploy ke Vercel belum |

---

## Catatan Teknis Penting

| Topik | Flutter | Next.js (Implemented) |
|-------|---------|----------------------|
| Route protection | `FFRoute requireAuth` | `proxy.ts` → `proxy()` function |
| Middleware file | — | `proxy.ts` (Next.js 16 convention, bukan `middleware.ts`) |
| Auth | Supabase Flutter | `@supabase/ssr` browser + server client |
| Global state | `FFAppState` ChangeNotifier | Zustand stores (auth, app, task, scope) |
| Data fetching | API Manager singleton | Tanstack Query + `lib/api/fetcher.ts` |
| Form validation | FlutterFlow FormFieldController | React Hook Form + Zod |
| CSS | FlutterFlowTheme tokens | Tailwind v4 CSS variables |
| `useSearchParams` | — | Harus dibungkus `<Suspense>` di Next.js 16 |
| `params` (dynamic route) | — | Bersifat `Promise` di Next.js 16, harus di-`use()` |
| Toast/snackbar | `InformationToastWidget` | `useToast()` hook + `<ToastProvider>` |
| Error handling | Try/catch + SnackBar | `<ErrorBoundary>` class component |
| Mobile sidebar | Drawer bawaan Flutter | CSS `translate-x` + Zustand `mobileSidebarOpen` |

---

*Last updated: 2026-06-01 — Semua 10 phase selesai. Sisa: deploy ke Vercel.*
*Flutter source: `/Users/andi/Downloads/s_m_dashboard`*
