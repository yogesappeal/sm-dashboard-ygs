# Scope of Work — Dokumentasi Alur & Penyimpanan

## Gambaran Umum

Fitur **Scope of Work** digunakan untuk mendefinisikan ruang lingkup pekerjaan dalam sebuah proyek. Setiap scope terhubung ke satu **Contract** dan berisi satu atau lebih **Scope Items** (per gedung/building), di mana masing-masing item memiliki daftar trade (jenis pekerjaan).

---

## Struktur Data

### `ScopeData` — Data scope dari API

```ts
interface ScopeData {
  scope_id: string         // Primary key
  scope_number: string     // Nomor urut scope (e.g. "SC-001")
  scope_name: string       // Nama scope (e.g. "Full House Package")
  type: string             // "supplier" | "subcontractor" | "both"
  notes: string            // Catatan tambahan (opsional)
  order_status: string     // Status (e.g. "Active", "Inactive")
  builder: string          // Nama builder
  client_ra_number: string // Nomor RA dari client / contract
  client_full_name: string // Nama lengkap client
  street_address: string   // Alamat proyek
  scope_details: ScopeDetail[]  // Item-item scope (per building)
}
```

### `ScopeDetail` — Item scope per gedung

```ts
interface ScopeDetail {
  building_id: string      // Primary key building
  building_name: string    // Nama gedung (e.g. "House", "Garage")
  status: string           // Status building scope
  trades: ScopeTrade[]     // Daftar trade yang dikerjakan
}

interface ScopeTrade {
  trade_id: string
  trade_name: string       // Nama trade (e.g. "Roofing", "Interior")
}
```

### `ScopeItem` — Representasi frontend saat input form

```ts
interface ScopeItem {
  id: string          // UUID lokal (hanya untuk React key, tidak dikirim ke API)
  buildingName: string
  tradeItems: string  // Comma-separated, e.g. "Roofing, Interior"
}
```

---

## Alur Fitur

### 1. Melihat Daftar Scope

```
User buka /scope
  → ScopePage memanggil getScopingPaginated(token, { page, limit: 10 })
  → API: GET /functions/v1/get-scopes-paginated?page=1&limit=10
  → Response: { data: ScopeData[], pagination: { totalPages, ... } }
  → Ditampilkan di tabel dengan kolom: Number, Name, Contract, Type, Status
```

Filter yang tersedia:
- **All** — semua type
- **Supplier** — hanya type `supplier`
- **Subcontractor** — hanya type `subcontractor`
- **Both** — type `both`

> Catatan: filter type saat ini dirender di frontend (filter tab tersedia) tetapi query ke API belum mengirim parameter `type` — pagination menggunakan `page` dan `limit` saja.

Cache: `staleTime: 2 menit` menggunakan React Query dengan key `['scopes', currentPage, typeFilter]`.

---

### 2. Melihat Detail Scope (Slide-Over)

```
User klik baris scope
  → selectedScope di-set ke ScopeData yang diklik
  → ScopeSlideOver muncul dari kanan
  → Menampilkan: scope_number, scope_name, type badges, order_status,
                 contract (client_ra_number + client_full_name),
                 street_address, builder, notes,
                 scope_details (list per building + trades)
```

Tidak ada API call tambahan — data diambil dari list yang sudah di-fetch.

---

### 3. Membuat Scope Baru

```
User klik "+ New Scope"
  → ScopeCreateModal terbuka
  → User mengisi form:
      - Scope Name (required)
      - Contract (dropdown, dari searchContract API)
      - Type: supplier | subcontractor | both
      - Scope Items: satu atau lebih pasangan (Building Name + Trade Items)
      - Notes (opsional)
  → Submit → insertScopeWithItems(token, payload)
  → API: POST /functions/v1/insert-scopes-with-items
  → onSuccess: invalidate query ['scopes', ...] → list refresh otomatis
```

**Payload yang dikirim ke API:**
```json
{
  "scope_name": "Full House Package",
  "contract_id": "uuid-kontrak",
  "type": "supplier",
  "notes": "...",
  "items": [
    { "building_name": "House", "trade_items": "Roofing, Interior" },
    { "building_name": "Garage", "trade_items": "Concrete" }
  ]
}
```

Scope items dikelola secara lokal menggunakan `useState<ScopeItem[]>` di dalam modal — bukan dari `useScopeStore` (store tersedia tapi tidak digunakan di modal ini).

---

### 4. Mengedit Scope

```
User klik "Edit" di slide-over
  → Form muncul di dalam slide-over (inline edit)
  → Data pre-filled dari scope yang dipilih
  → scope_details di-map menjadi ScopeItem[] menggunakan generateScopeItem()
  → User bisa ubah: scope_name, type, notes, scope items
  → Submit → updateScopeData(token, payload)
  → API: POST /functions/v1/update-scope
  → onSuccess: invalidate query → list refresh, mode edit ditutup
```

**Payload yang dikirim ke API:**
```json
{
  "scope_id": "uuid-scope",
  "scope_name": "Updated Name",
  "type": "both",
  "notes": "...",
  "items": [
    { "building_name": "House", "trade_items": "Roofing" }
  ]
}
```

---

## Cara Akses Data Scope dari Halaman Lain

Selain dari halaman `/scope`, data scope bisa diakses melalui:

| Fungsi | Endpoint | Digunakan di |
|---|---|---|
| `getScopeDetailByContractId(token, contractId)` | `GET /functions/v1/get-scope-by-contract-id` | Contract detail / contract preview |
| `getScopeDetailByPOId(token, poId)` | `GET /functions/v1/get-scope-by-po-id` | Purchase Order detail |

---

## State Management

| Layer | Mekanisme | Scope Data |
|---|---|---|
| **Server cache** | React Query | List scope (`['scopes', page, typeFilter]`) |
| **UI state lokal** | `useState` | `selectedScope`, `showCreateModal`, items di form |
| **Zustand store** | `useScopeStore` | `draftItems` — tersedia tapi belum dipakai di modal utama |

---

## File-file Terkait

| File | Peran |
|---|---|
| [app/(dashboard)/scope/page.tsx](../app/(dashboard)/scope/page.tsx) | Halaman utama, orchestrate semua komponen |
| [components/cards/scope-row.tsx](../components/cards/scope-row.tsx) | Baris tabel + header |
| [components/cards/scope-slide-over.tsx](../components/cards/scope-slide-over.tsx) | Panel detail + form edit |
| [components/forms/scope-create-modal.tsx](../components/forms/scope-create-modal.tsx) | Modal/panel buat scope baru |
| [lib/api/scope.ts](../lib/api/scope.ts) | Semua API call untuk scope |
| [lib/types/scope.ts](../lib/types/scope.ts) | Type definitions |
| [lib/utils/scope.ts](../lib/utils/scope.ts) | Helper: `generateScopeItem`, `parseScopeItems`, `mapBuildingTrades` |
| [lib/store/scope-store.ts](../lib/store/scope-store.ts) | Zustand store untuk draft items |
