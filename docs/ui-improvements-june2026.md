# UI Improvements — June 2026

Dokumentasi perubahan yang dilakukan pada session ini. Mencakup perbaikan UI/UX pada halaman Suppliers, Scope of Work, dan Tasks.

---

## 1. Suppliers Page

### Masalah yang Ditemukan
- **UI tidak seragam**: Add Supplier memakai centered modal, Detail/Edit memakai slide-over
- **Bug API**: `SupplierCreateModal` memanggil `updateSupplierData` alih-alih fungsi create
- **Double submit**: Tombol "Add Supplier" punya `onClick` + form punya `onSubmit` yang sama → satu klik bisa kirim request dua kali

### Perubahan

#### `lib/api/suppliers.ts`
- Tambah fungsi `createSupplierData` → memanggil `/functions/v1/create-supplier`
- Pisah dari `updateSupplierData` yang tetap memanggil `/functions/v1/update-supplier`

#### `components/forms/supplier-create-modal.tsx`
- Konversi dari centered modal (`flex items-center justify-center`) ke **slide-over dari kanan**
- Pakai layout yang sama dengan `SupplierSlideOver`: `fixed top-0 right-0`, `max-w-[437px]`, `rounded-tl-[50px]`
- Ganti API call ke `createSupplierData`
- Fix double submit: hapus `onClick` dari tombol submit, cukup pakai `onSubmit` di form + button `type="submit"`
- Tombol Save & Cancel dipindah ke dalam form (bukan footer terpisah)

---

## 2. Scope of Work Page

### Masalah yang Ditemukan
- **UI tidak seragam**: `ScopeCreateModal` memakai centered modal, `ScopeSlideOver` memakai slide-over
- **Tidak ada edit mode**: `ScopeSlideOver` hanya read-only, tidak ada tombol Edit
- **Double submit** di `ScopeCreateModal` (sama seperti supplier)
- **Type badge tidak konsisten**: di table ada 2 pill terpisah (biru/ungu), di detail view pakai `StatusBadge` tunggal

### Perubahan

#### `lib/api/scope.ts`
- Tambah fungsi `updateScopeData` → memanggil `/functions/v1/update-scope`

#### `components/forms/scope-create-modal.tsx`
- Konversi ke **slide-over** (pola identik dengan supplier)
- Fix double submit
- Header: X button kiri, title "Create Scope of Work"

#### `components/cards/scope-slide-over.tsx`
- Tambah props: `token: string`, `queryKey: unknown[]`
- Tambah **edit mode** dengan toggle tombol Edit di header
- Edit form berisi field yang sama dengan create form: Scope Name, Type, Scope Items (add/remove building + trades), Notes
- Saat tombol Edit diklik: scope items di-pre-populate dari `scope_details` yang ada (building name + trades di-join dengan koma)
- **Type badges** di view mode diubah: `scope.type` di-split by comma, tiap type dapat pill warna sendiri:
  - Supplier → `bg-blue-50 text-blue-600`
  - Subcontractor → `bg-purple-50 text-purple-600`

#### `app/(dashboard)/scope/page.tsx`
- Pass props `token` dan `queryKey` ke `ScopeSlideOver`

---

## 3. Tasks Page — Asana-like Experience

Implementasi bertahap (5 step) untuk membuat Tasks page interaktif seperti Asana.

### Step 1 — Task Detail Slide-over

**Masalah**: Create & Edit task memakai centered modal, tidak konsisten dengan halaman lain.

#### `components/cards/task-slide-over.tsx` *(baru)*
- Komponen slide-over tunggal untuk **create dan edit** task
- Layout Asana-style:
  - Title besar dengan underline border di atas
  - Description sebagai textarea bebas
  - Field-field dengan ikon di kiri: Status (select + color dot), Due Date, Assignee, Category, Priority (toggle star), Project
  - Status pill tampil di header panel
- Props: `token`, `task?` (null = create mode), `onClose`, `queryKey`

#### `components/cards/task-card.tsx`
- Klik area konten → buka slide-over (sebelumnya hanya ikon Edit yang bisa diklik)
- Tombol ikon Edit dihapus, diganti ikon `ArrowUpRight` yang muncul on-hover

#### `app/(dashboard)/tasks/page.tsx`
- Ganti import `TaskCreateEditModal` → `TaskSlideOver`
- State `showCreateModal` dan `editingTask` tetap, cukup ganti komponen yang di-render

---

### Step 2 — Inline Title Edit

**Goal**: Klik judul task di list → langsung bisa rename tanpa buka panel.

#### `components/cards/task-card.tsx`
- Tambah state `editingField: EditingField` (union type)
- Klik judul → render `<input>` menggantikan `<p>`
- Enter → save via `updateExistingTask`
- Escape → cancel, nilai kembali ke semula
- Blur → save jika ada perubahan
- Spinner inline muncul saat mutation pending
- Ikon `ArrowUpRight` (buka slide-over) muncul on-hover di kanan row

---

### Step 3 — Quick-Add Row

**Goal**: Tambah task baru tanpa membuka modal/slide-over.

#### `components/cards/task-quick-add.tsx` *(baru)*
- Komponen reusable, muncul di bawah setiap group/list
- **Collapsed state**: baris `+ Add task` dengan warna slate-400
- **Expanded state**: row mirip TaskCard — dimmed checkbox + input autoFocus
  - Enter → kirim ke API (`insertNewTask`), input tetap terbuka untuk task berikutnya
  - Escape / blur → collapse
  - Spinner muncul saat pending
- Props: `token`, `status`, `queryKey`, `parentTaskId?`, `placeholder?`

#### `app/(dashboard)/tasks/page.tsx`
- `TaskQuickAdd` ditambahkan di:
  - Bottom setiap status group (grouped view) — status otomatis sesuai group
  - Bottom flat list (saat filter status aktif) — status sesuai filter

---

### Step 4 — Richer Row Fields

**Goal**: Field metadata (category, due date, assignee) bisa diedit langsung di row.

#### `components/cards/task-card.tsx`
- State `editValues` menyimpan nilai live untuk ketiga field
- `useEffect` sync `editValues` dengan task prop saat tidak sedang editing
- Single `patchMutation` untuk semua field update — selalu kirim full task body

| Field | Ada nilai | Kosong (hover row) | Saat edit |
|---|---|---|---|
| **Category** | Pill ungu, klik → edit | `+ Category` muncul | Input rounded-full in-place |
| **Due Date** | Tanggal + ikon kalender | `📅 Due date` muncul | Date picker — pilih → **langsung save & tutup** |
| **Assignee** | Nama + ikon user | `👤 Assignee` muncul | Input text, blur/Enter save |

- Semua field: Enter = save, Escape = cancel

---

### Step 5 — Subtasks

**Goal**: Task bisa punya sub-task yang bisa di-expand/collapse inline.

Data model sudah support (`parent_task_id` di `TaskModel`).

#### `lib/utils/tasks.ts`
- Tambah `buildSubtaskMap(tasks)` → `Record<string, TaskModel[]>`
  - Map `parent_task_id → children[]`

#### `components/cards/task-quick-add.tsx`
- Tambah prop `parentTaskId?: string`
- Jika diisi, `insertNewTask` dikirim dengan `parent_task_id`
- Label tombol berubah: "Add task" → "Add subtask"

#### `components/cards/task-card.tsx`
- Tambah prop `subtasks?: TaskModel[]`
- Tambah state `isExpanded: boolean`
- Tambah fungsi `usePatchMutation` (shared hook internal) untuk dry mutation builder
- **Subtask count badge**: muncul di metadata row jika ada subtasks dan sedang collapsed — klik untuk expand
- **Chevron button** (`›`): muncul on-hover di kanan row, rotate 90° saat expanded
- **SubtaskRow component** (di file yang sama):
  - Row compact dengan indent line di kiri
  - Checkbox status toggle
  - Inline title edit (sama seperti TaskCard)
  - Due date + assignee display (read-only)
  - Ikon `↗` untuk buka slide-over detail
  - Tidak ada expand lebih lanjut (single level subtask)
- **Subtask section** (expanded): `bg-slate-50/50`, berisi `SubtaskRow` + `TaskQuickAdd` dengan `parentTaskId`

#### `app/(dashboard)/tasks/page.tsx`
- Build `subtaskMap` dari `allTasks`
- Filter `rootTasks = allTasks.filter(t => !t.parent_task_id)` — subtasks tidak muncul di list utama
- Pass `subtasks={subtaskMap[task.id] ?? []}` ke setiap `TaskCard`

---

## Ringkasan File yang Berubah

| File | Status | Perubahan |
|---|---|---|
| `lib/api/suppliers.ts` | Modified | Tambah `createSupplierData` |
| `lib/api/scope.ts` | Modified | Tambah `updateScopeData` |
| `lib/utils/tasks.ts` | Modified | Tambah `buildSubtaskMap` |
| `components/forms/supplier-create-modal.tsx` | Modified | Konversi ke slide-over, fix bug API + double submit |
| `components/forms/scope-create-modal.tsx` | Modified | Konversi ke slide-over, fix double submit |
| `components/cards/supplier-slide-over.tsx` | — | Tidak ada perubahan di session ini |
| `components/cards/scope-slide-over.tsx` | Modified | Tambah edit mode, pre-populate items, type pills |
| `components/cards/task-card.tsx` | Modified | Inline edit title+fields, subtask expand/collapse, SubtaskRow |
| `components/cards/task-slide-over.tsx` | **New** | Slide-over create+edit untuk task |
| `components/cards/task-quick-add.tsx` | **New** | Quick-add row inline, support subtask |
| `app/(dashboard)/scope/page.tsx` | Modified | Pass token+queryKey ke ScopeSlideOver |
| `app/(dashboard)/tasks/page.tsx` | Modified | Ganti modal → slide-over, subtaskMap, QuickAdd |

---

## Catatan Backend

Endpoint yang diasumsikan ada (belum diverifikasi):

| Endpoint | Dipakai untuk |
|---|---|
| `POST /functions/v1/create-supplier` | Create supplier baru |
| `POST /functions/v1/update-scope` | Update scope data |

Jika endpoint belum ada, perlu dibuat di Supabase Edge Functions. Untuk `create-supplier`, jika backend handle create+update dalam satu endpoint (`update-supplier`) berdasarkan ada/tidaknya `supplier_id`, cukup ubah URL di `createSupplierData` di `lib/api/suppliers.ts`.
