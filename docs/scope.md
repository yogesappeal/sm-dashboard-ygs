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

---

## Rencana: Status & Target Tanggal PO per Trade (Diskusi — belum diimplementasi)

Hasil diskusi soal kebutuhan baru: tiap trade di dalam scope perlu punya **status sendiri** dan **target tanggal PO** (`estimated_po_date`), dipicu dari kebutuhan di halaman `contract-preview` (section Priorities dan Create PO).

### Konteks & keputusan

- Sempat dipertimbangkan mengubah `scope_details[].trades[]` (nested per building) jadi struktur flat `scope_items[]` dengan trade sebagai master/katalog (ID trade tetap lintas building).
- **Keputusan: tidak jadi** — karena `trade_name` di-input bebas (free text) oleh user saat membuat scope (lihat [Membuat Scope Baru](#3-membuat-scope-baru), field `trade_items` comma-separated), bukan dari katalog tetap. Jadi tidak ada "trade master" yang bisa dijadikan acuan ID lintas building.
- **Struktur lama (`ScopeDetail.trades: ScopeTrade[]`, nested per building) dipertahankan.** Perubahan yang diperlukan minimal, bukan restrukturisasi.

### Temuan: `trade_id` sebenarnya sudah unik per (building, trade)

Contoh dari response API asli:
```json
"scope_details": [
  {
    "building_id": "90aba34b-...", "building_name": "Main Building",
    "trades": [
      { "trade_id": "0803bbd7-...", "trade_name": "Roof" },
      { "trade_id": "886e7f3a-...", "trade_name": "Solar Panel" }
    ]
  },
  {
    "building_id": "8925244f-...", "building_name": "Small Garage",
    "trades": [
      { "trade_id": "eb2334ed-...", "trade_name": "Roof" }
    ]
  }
]
```
"Roof" di Main Building dan "Roof" di Small Garage sudah punya `trade_id` **berbeda** — jadi identitas per (building, trade) sudah cukup, tidak perlu ID baru. Tinggal tambah 2 field di tiap object trade.

### Rekomendasi BE (minimal)

Tambah `status` dan `estimated_po_date` langsung di tiap item `trades[]`, tanpa ubah nesting:
```json
"trades": [
  {
    "trade_id": "0803bbd7-...",
    "trade_name": "Roof",
    "status": "In Progress",
    "estimated_po_date": "2026-07-20"
  }
]
```

**Rollup status building** (dihitung, bukan disimpan terpisah — hindari data basi):
```
ada trade berstatus Urgent     → building = Urgent   (prioritas tertinggi, menang)
semua trade Not Started        → building = Not Started
campuran status lain           → building = In Progress
semua trade Completed          → building = Completed
```

### Bug FE yang perlu diperbaiki bersamaan

Di `app/(dashboard)/contract-preview/_components/center-panel.tsx` (`CreatePOCanvas`), saat scope building-centric di-pivot jadi trade-centric untuk checklist form Create PO (grouping berdasarkan `trade_name.toLowerCase()` supaya "Roof" di beberapa building tampil sebagai satu section), **hanya `trade_id` dari kemunculan pertama yang disimpan** — `trade_id` milik building lain hilang.

Fix: tambah field `tradeId` di `BuildingEntry` (bukan cuma di `TradeSection`), supaya tiap building di dalam satu trade section tetap ingat `trade_id` aslinya masing-masing:
```ts
interface BuildingEntry {
  buildingId: string
  buildingName: string
  tradeId: string   // ← tambahan, trade_id spesifik milik building ini
  checked: boolean
  open: boolean
  notes: string
}
```

### Payload submit PO — tetap sparse (sudah benar, tinggal dilengkapi ID)

Kode submit PO (`handleSubmit` di `CreatePOCanvas`) **sudah** hanya mengirim baris yang dicentang (`.filter(b => b.checked)`), bukan seluruh matrix building×trade dengan `true`/`false` seperti implementasi FlutterFlow sebelumnya — pola ini dipertahankan. Yang ditambahkan cuma `trade_id`/`building_id` per baris (selain teks nama yang sudah ada), supaya BE bisa relasi presisi ke baris scope asli:
```json
"order_details": [
  {
    "trade_id": "0803bbd7-...",
    "trade_name": "Roof",
    "building_id": "90aba34b-...",
    "building_name": "Main Building",
    "notes": "..."
  }
]
```

### Ringkasan perubahan yang dibutuhkan

| Sisi | Perubahan |
|---|---|
| BE/DB | Tambah `status` + `estimated_po_date` di tiap object `trades[]`. Tidak ubah nesting. |
| BE | Hitung `scope_details[].status` (building) dari rollup status trade di dalamnya (aturan di atas). |
| FE | `BuildingEntry` bawa `tradeId` sendiri per building (bukan cuma satu `tradeId` di level `TradeSection`). |
| FE | Payload submit PO tambah `trade_id`/`building_id` per baris, di samping teks nama yang sudah ada. |
| FE | Tampilkan `status`/`estimated_po_date` baru per trade di UI (Priorities kiri panel, checklist Create PO). |
| FE | Priorities di `left-panel.tsx` baca status per-trade asli dari API, hapus workaround propagate status building→trade. |
