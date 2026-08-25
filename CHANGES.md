# SM Dashboard — Development Log

Branch: `development`  
Commit: `9de563c`

---

## 1. Environment Setup

- Buat file `.env.local` dengan variabel berikut:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
  NEXT_PUBLIC_FEATURE_TASK=true
  ```
- `.env.local` di-ignore oleh git (tidak boleh di-commit)

---

## 2. API Field Name Mapping (camelCase → snake_case)

Semua Supabase Edge Function mengembalikan snake_case. Semua type, component, dan page disesuaikan.

### `lib/types/contract.ts` — `DataContract`
| Sebelum | Sesudah |
|---|---|
| `clientFullName` | `project_name` |
| `createdAt` | `deposit_date` |
| `contractValue` | `total_contract_value` |
| `status` | `project_status` |

### `lib/types/user.ts` — `UserDetails`
| Sebelum | Sesudah |
|---|---|
| `firstName` | `first_name` |
| `lastName` | `last_name` |
| `fullName` | `full_name` |
| `mobilePhone` | `mobile_phone` |
| `imageUrl` | `image_url` |
| `jobTitle` | `job_title` |
| `referenceId` | `reference_id` |

### `lib/types/purchase-order.ts` — `POData`
| Sebelum | Sesudah |
|---|---|
| `poNumber` | `po_number` |
| `supplierName` | `supplier_name` |
| Hapus: `contractId`, `contractName`, `totalAmount`, `createdAt`, `updatedAt` | Tambah: `total_count?` |

### `lib/types/supplier.ts` — `SupplierData`
| Sebelum | Sesudah |
|---|---|
| `supplierCode` | `supplier_code` |
| `totalCount` | `total_count?` |
| — | `created_at` |

### `lib/types/scope.ts` — `ScopeData`
| Sebelum | Sesudah |
|---|---|
| `scopeId` | `scope_id` |
| `scopeName` | `scope_name` |
| `scopeNumber` | `scope_number` |
| `scopeDetails` | `scope_details` |
| `orderStatus` | `order_status` |
| `clientRaNumber` | `client_ra_number` |
| `clientFullName` | `client_full_name` |
| `streetAddress` | `street_address` |

Tambah interface baru: `ScopeDetail` dan `ScopeTrade` sesuai nested response.

### `lib/types/task.ts` — `TaskModel`
| Sebelum | Sesudah |
|---|---|
| `dueDate` | `due_date` |
| `isActive` | `is_active` |
| `createdBy` | `created_by` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `parentTaskId` | `parent_task_id` |
| `projectId` | `project_id` |
| `projectName` | `project_name` |

Tambah interface `TasksResponse` untuk wrap response `{ success, message, data, meta }`.

### `lib/types/shared.ts` — `Pagination`
- Tambah `total_pages?` sebagai alternatif `totalPages` (API mengembalikan snake_case)

---

## 3. API Layer Fixes

### `lib/api/dashboard.ts`
- Response shape: `{ response: [{ users: {...}, metrics: [...] }] }`
- Tambah `normalizeMetrics()` untuk extract `response[0].metrics`
- Berlaku untuk `getDashboardMetrics` dan `getOpsMetrics`

### `lib/api/tasks.ts`
- Tambah normalisasi response: `Array.isArray(res) ? res : (res.data ?? [])`
- Handle dua kemungkinan shape: array langsung atau `{ data: [...] }`

### `lib/api/suppliers.ts`
- Tambah params: `company` (default: `'AusHail'`), `order_by`, `order_dir` (default: `'desc'`)
- `company` wajib dikirim sesuai requirement Edge Function

### `lib/api/purchase-orders.ts`
- Tambah param `search` ke `GetPOParams` dan `getPurchaseOrdersPaginated`

---

## 4. Dashboard Home (`app/(dashboard)/page.tsx`)

- **Search**: input di kanan atas table, dikirim ke API via param `search`, ada tombol clear
- **Sort**: setiap kolom header bisa diklik (client-side sort), ikon `↕`/`↑`/`↓`
- **Filter status** via MetricCard (Deposit / Pending / Active) tetap berjalan
- Fix `pagination.total_pages` fallback di PaginationBar

---

## 5. Purchase Orders (`app/(dashboard)/purchase-orders/page.tsx`)

- **Search input** ditambahkan di kanan atas table
- Filter `type` dan `status` dikirim ke API (server-side) — perlu implementasi di backend Edge Function `get-po-paginated`
- `staleTime: 0` agar filter selalu re-fetch

---

## 6. Suppliers (`app/(dashboard)/suppliers/page.tsx`)

- **Sort**: kolom Name, Company, Status bisa diklik, dikirim ke API via `order_by` + `order_dir`
- Default sort: `order_dir=desc`
- `company=AusHail` selalu dikirim

---

## 7. Scope (`app/(dashboard)/scope/page.tsx`)

- Kolom **Name** diperlebar (`flex-[3]` → `flex-[4]`)
- Kolom **Type**: field `"Supplier, Subs"` di-split per koma, tiap tag badge terpisah:
  - `Supplier` → badge biru
  - `Subs` → badge ungu
- Slide-over menampilkan `scope_details` dengan `building_name`, status badge, dan daftar trade names

---

## 8. Tasks (`app/(dashboard)/tasks/page.tsx`)

- Fix crash `tasks.reduce is not a function` — guard dengan `Array.isArray()`
- Field names semua diupdate ke snake_case
- Form edit task diupdate untuk field `due_date`, `project_id`, dll

---

## 9. Sidebar & Header

### Sidebar (`components/layout/sidebar.tsx`)
- User footer di bagian bawah sidebar menjadi **clickable button**
- Klik avatar → muncul floating menu dengan:
  - Nama dan email user (header)
  - **Profile** (belum dihubungkan ke halaman)
  - **Settings** (belum dihubungkan ke halaman)
  - **Logout** (merah, memanggil Supabase signOut + clear store)
- Floating menu tertutup otomatis saat klik di luar
- Saat sidebar collapsed (mode icon), floating menu tetap bisa muncul

### Header (`components/layout/header.tsx`)
- Hapus tombol logout dari header
- Hapus avatar + initials dari header
- Header sekarang hanya menampilkan greeting, role badge, dan bell notification

---

## 10. Auth Provider (`components/shared/auth-provider.tsx`)

- Fix: `onAuthStateChange` listener sekarang juga memanggil `getUserDetails` dan set `user` + `role`
- Sebelumnya hanya update `token`, sehingga `role` bisa tetap `null` setelah refresh

---

## 11. Pending / TODO

- [ ] Filter Purchase Orders (type, status) — perlu implementasi di backend Edge Function `get-po-paginated`
- [ ] Halaman Profile dan Settings — belum ada route/page
- [ ] `NEXT_PUBLIC_SUPABASE_URL` di `fetcher.ts` digunakan sebagai base URL API — pastikan Edge Functions sudah ter-deploy di Supabase
