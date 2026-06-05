# Contract Detail — New 3-Panel Layout (Preview)

## Overview

Halaman preview di `/contract-preview` adalah prototype UI untuk redesign halaman detail kontrak. Dibangun dengan **dummy data** agar bisa divalidasi secara visual sebelum diintegrasikan ke data real.

Akses melalui menu **Preview** (ikon labu) di sidebar.

---

## Struktur File

```
app/(dashboard)/contract-preview/
├── page.tsx                          ← Entry point, berisi semua dummy data
└── _components/
    ├── types.ts                      ← Interface DummyContract, DummyCrew, DummyScope, DummyPO
    ├── canvas-state.ts               ← CanvasContext type + canvasReducer
    ├── contract-layout.tsx           ← 3-panel shell + TopBar + useReducer
    ├── left-panel.tsx                ← Panel kiri (photo, tabs, client info, crew, priorities)
    ├── center-panel.tsx              ← Canvas dinamis (activity / create PO / PO detail)
    └── right-panel.tsx              ← Panel kanan (All Scope navigator + PO Tracker)
```

---

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  TopBar: ← nama klien / alamat   [status]   start date   days open  │
│          REMAINING SUM: $35,890   IN ADS: $59,790                   │
├──────────────┬──────────────────────────────┬───────────────────────┤
│  LEFT PANEL  │      CENTER CANVAS           │    RIGHT PANEL        │
│  w-[300px]   │      flex-1                  │    w-[280px]          │
│              │                              │                       │
│  📷 Photo   │  [Activity / Create PO /     │  [All Scope]          │
│  Details|Doc │   PO Detail]                 │  [PO Tracker]         │
│              │                              │                       │
│  ▾ Client    │  Konten berubah sesuai        │  Status legend        │
│  ▾ Crew      │  aksi yang dipilih           │  Scope navigator tree │
│  ▾ Priorities│                              │  PO grouped by status │
└──────────────┴──────────────────────────────┴───────────────────────┘
```

**CSS height:** `h-[calc(100svh-64px)]` — 64px adalah tinggi header (`h-16`)

---

## Canvas State

File: `_components/canvas-state.ts`

```ts
type CanvasContext =
  | { view: 'activity' }
  | { view: 'create-po'; poType: 'supplier' | 'subcontractor'; buildingName?: string; tradeName?: string }
  | { view: 'po-detail'; poId: string }
```

State dikelola dengan `useReducer` di `contract-layout.tsx`. `dispatch` diteruskan ke semua panel sebagai prop `onCanvas`.

### Cara ganti canvas view:
```ts
onCanvas({ type: 'SHOW_ACTIVITY' })
onCanvas({ type: 'SHOW_CREATE_PO', poType: 'supplier', buildingName: 'House', tradeName: 'Roofing' })
onCanvas({ type: 'SHOW_PO_DETAIL', poId: 'po-1' })
```

---

## Left Panel

**Komponen:** `left-panel.tsx`

| Section | Konten |
|---|---|
| Photo area | Placeholder (belum ada image gallery) |
| Tabs | Details / Documents |
| Client | Full name, address, ownership, contract value, PIF, notes |
| Crew | Grid 2 kolom dengan avatar initial |
| Priorities | Auto-derived dari status PO & scope trades |

**Logika priorities:**
- PO `PO Rejected` → level `high` (merah)
- Trade `Urgent` → level `high` (merah)
- PO `PO Draft` → level `medium` (amber)

---

## Center Canvas — 3 Views

### 1. Activity (default)
Timeline vertikal dengan kartu per event. Events diambil dari dummy data `ACTIVITIES` di `center-panel.tsx`.

### 2. Create PO
- Toggle **Supplier** / **Subcontractor**
- Supplier form: dropdown supplier, delivery date, site info, delivery method, tabel material (description, qty, unit, rate)
- Subcontractor form: dropdown sub, delivery date, total price (AUD), job details
- Footer: Cancel · Save as Draft · Preview PO

### 3. PO Detail
- Header: PO number + status badges + action buttons (Send PO / Accept / Reject)
- Reject: expands inline textarea untuk alasan penolakan
- Body grid 3 kolom: PO info + order details + side cards (supplier/subcontractor + client)

---

## Right Panel

**Komponen:** `right-panel.tsx`

### All Scope tab
Tree navigator:
```
▾ SC-2026-00001-3E3  [In Progress]
    [+ Supplier]  [+ Subs]
    ▾ House · building
        ● Roofing · trade      [hover → + Create PO]
        ● Electrical · trade   [hover → + Create PO]
        🔴 Plumbing · trade    [hover → + Create PO]
    ▾ Garage · building
        ● Roofing · trade      [hover → + Create PO]
```

Status dot:
- 🔴 `bg-red-400` → Urgent
- 🟡 `bg-yellow-400` → In Progress / default
- 🟢 `bg-green-400` → Completed

### PO Tracker tab
PO dikelompokkan berdasarkan status. Klik PO → canvas ganti ke PO Detail.

---

## Dummy Data (di `page.tsx`)

| Variabel | Isi |
|---|---|
| `CONTRACT` | Lisa D'Hondt, 25 Lake Point Way NSW, Active, $59,790 |
| `CREW` | Daniel (Site Lead), Galang x3 (Roofing/Groundie/Labourer) |
| `SCOPES` | 1 scope dengan 2 buildings (House: 3 trades, Garage: 1 trade) |
| `POS` | PO Draft (Roofing Co.), PO Submitted (Elec Sub), PO Completed (Plumbing Mate) |

---

## Langkah Integrasi ke Data Real

Saat screen sudah divalidasi, langkah berikutnya:

1. **Buat route baru** `app/(dashboard)/contract/[id]/preview/page.tsx` atau langsung ganti `app/(dashboard)/contract/[id]/page.tsx`
2. **Ganti dummy data** dengan query real:
   - `getContractDetails(token, id)` → `DummyContract`
   - `getCrewPerProject(token, id)` → `DummyCrew[]`
   - `getScopingPaginated(token, { contractId: id, limit: 100 })` → `DummyScope[]`
   - `getPurchaseOrdersPaginated(token, { contractId: id, limit: 50 })` → `DummyPO[]`
3. **Extract form logic** dari `center-panel.tsx` ke komponen terpisah menggunakan API call real (`insertPurchaseOrder`, `insertPurchaseOrderSubcontractor`)
4. **Wire invalidation**: setelah create/update PO, panggil `queryClient.invalidateQueries({ queryKey: ['pos-by-contract', id] })`
5. **Hapus link Preview** dari sidebar (`components/layout/sidebar.tsx`)

---

## Catatan

- File lama (`app/(dashboard)/contract/[id]/page.tsx`) **tidak disentuh**
- Preview dapat diakses via menu **Preview** di sidebar (ikon labu flask)
- Semua interaksi canvas (create PO, view detail, accept/reject) bersifat **visual only** — tidak ada API call
