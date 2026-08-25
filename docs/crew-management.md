# Crew Management & Assignment — Plan

## Status

📝 **Planning doc** — belum diimplementasi kecuali bagian yang secara eksplisit ditandai ✅ **Sudah ada**.

## Latar Belakang

Saat ini crew (site lead, roofer, groundie, dll.) sudah bisa **di-assign ke project** dari halaman detail contract (`/contract-preview/[id]`, left panel → section "Crew"), tapi:

- Crew member itu sendiri **harus sudah ada di database** sebelum bisa di-assign — tidak ada tempat untuk **membuat, mengedit, atau menonaktifkan** crew dari aplikasi ini sama sekali.
- Tidak ada halaman admin yang menampilkan **semua crew** di satu tempat (siapa saja yang ada, sedang di-assign ke project mana, statusnya aktif/tidak).

Dokumen ini merencanakan fitur **Crew Management** di admin panel: CRUD data crew + pengelolaan assignment-nya, melengkapi flow assign-only yang sudah ada.

---

## Yang Sudah Ada ✅

| Bagian | Lokasi | Keterangan |
|---|---|---|
| Assign crew ke project | `app/(dashboard)/contract-preview/_components/left-panel.tsx` (`CrewAssignPicker`) | Icon di header accordion "Crew" → popup search & pilih dari list crew yang sudah ada → assign |
| List crew (untuk dipilih) | `lib/api/crew.ts` → `getCrewPaginated()` | `GET /functions/v1/get-crew-paginated?page=&limit=&order_dir=&search=&company=` |
| Assign/unassign 1 crew ke 1 project | `lib/api/crew.ts` → `updateProjectCrew()` | `POST /functions/v1/update-project-crew` — body `{ project_id, crew_id \| null }` |
| Tampilkan crew yang ter-assign | `left-panel.tsx`, section Crew (grid + subtitle accordion) | Sumber: `ContractDetailsCrewItem` (`role`, `crew_name`, `user_name`, `assignment_id`) dari `GET /contract-details` |

**Yang belum ada / gap utama:** tidak ada endpoint maupun UI untuk **membuat record crew baru**, **mengedit**, atau **menonaktifkan** crew. `get-crew-paginated` diasumsikan hanya membaca dari tabel yang sudah terisi lewat jalur lain (mis. input manual di database / sistem lain) — perlu dikonfirmasi ke backend.

---

## Data Model (perlu dikonfirmasi ke backend)

Field yang **sudah terkonfirmasi terpakai** (dari response `get-crew-paginated` yang diasumsikan, dan dari `ContractDetailsCrewItem`):

| Field | Sumber | Catatan |
|---|---|---|
| `id` | `get-crew-paginated` | Asumsi — belum ada contoh response resmi |
| `name` | `get-crew-paginated` | Asumsi field name-nya `name`, bisa jadi `full_name` |
| `role` | `get-crew-paginated`, `ContractDetailsCrewItem.role` | Mis. "Site Lead", "Roofer" |
| `company` | `get-crew-paginated` (dipakai sbg filter query param) | Perusahaan/team crew tsb bernaung |
| `crew_name` | `ContractDetailsCrewItem.crew_name` | **Beda konsep dari `name`** — ini nama tim/crew (mis. "Alpha"), bukan nama individu. Perlu diklarifikasi: apakah "crew" di sistem ini adalah *individu* atau *tim beranggota banyak orang*? |
| `assignment_id` | `ContractDetailsCrewItem.assignment_id` | ID dari relasi assignment (project ↔ crew), bukan ID crew itu sendiri |

⚠️ **Pertanyaan kunci yang harus dijawab backend/product sebelum implementasi CRUD:**
1. Satu record "crew" itu **satu orang**, atau **satu tim** (beranggotakan banyak orang, dengan `crew_name` sebagai nama tim)? Ini menentukan bentuk form create/edit sepenuhnya.
2. Apakah `crew_id` yang dikirim ke `update-project-crew` sama dengan `id` di response `get-crew-paginated`?
3. Field apa saja yang **wajib** saat membuat crew baru (nama, role, company, kontak — phone/email?)
4. Apakah ada relasi many-to-many (satu crew bisa di-assign ke banyak project sekaligus, atau satu project cuma boleh satu crew per waktu)? `update-project-crew` saat ini terlihat 1 project → 1 crew_id per call, artinya kemungkinan **replace**, bukan **tambah ke list** — perlu dikonfirmasi apakah assign crew baru akan **menimpa** assignment lama atau menambah.

---

## Rencana Halaman Admin: Crew Management

### Lokasi

Menu baru di sidebar admin, mis. **"Crew"** — sejajar dengan Suppliers (pola serupa: list + detail + CRUD sudah ada preseden di `/suppliers`).

### 1. List Crew (`/crew`)

Tabel dengan kolom: Nama, Role, Company, Status (Active/Inactive), Jumlah project aktif (assigned count), Aksi.

- Search box (by name)
- Filter: Company, Role, Status
- Pagination (reuse pola `get-crew-paginated` yang sudah ada — tinggal dipakai ulang, bukan endpoint baru)
- Tombol **"+ Add Crew"** di kanan atas

### 2. Create / Edit Crew (modal atau slide-over)

Form fields (tentatif, tunggu konfirmasi data model di atas):
- Nama *(required)*
- Role *(required, dropdown atau free text — cek apakah role itu enum tetap atau bebas)*
- Company *(dropdown, karena `get-crew-paginated` sudah punya filter by company → berarti company itu entity/list tersendiri)*
- Kontak (phone / email) — opsional, kalau ada di data model
- Status: Active / Inactive (default Active)

Submit → create/update → kembali ke list, toast sukses.

### 3. Detail Crew (opsional, fase 2)

Halaman detail per crew menampilkan:
- Info crew
- **Riwayat/daftar project** yang sedang & pernah di-assign (reverse lookup dari assignment) — berguna untuk melihat beban kerja crew tsb
- Tombol edit / deactivate

### 4. Deactivate, bukan Delete

Untuk menjaga integritas data historis (assignment lama tetap valid secara referensial), **tidak disarankan hard delete**. Gunakan soft-deactivate (`status: inactive`) — crew yang inactive otomatis disembunyikan dari `CrewAssignPicker` di contract-preview (filter `status=active` saat search), tapi assignment historisnya tetap tampil apa adanya di halaman contract yang sudah menggunakan crew tsb.

---

## Rekomendasi Flow

### Flow A — Admin menambah crew baru
1. Admin buka `/crew` → klik "+ Add Crew"
2. Isi form (nama, role, company, dst.) → Save
3. Sistem `POST /functions/v1/create-crew` (baru, lihat bagian API di bawah)
4. Crew baru langsung muncul di list, dan otomatis bisa dicari dari `CrewAssignPicker` di halaman contract manapun (karena sumbernya sama: `get-crew-paginated`)

### Flow B — Admin mengedit crew
1. Klik baris crew di list / tombol edit
2. Ubah field → Save
3. `POST /functions/v1/update-crew` (baru)
4. Perubahan (mis. ganti role) otomatis reflect di semua tempat yang menampilkan crew tsb setelah cache di-invalidate

### Flow C — Assign crew ke project *(sudah ada, referensi)*
1. SM buka contract detail → left panel → section Crew → klik icon assign
2. Popup muncul, load list crew aktif via `get-crew-paginated`
3. Pilih crew → `update-project-crew` → assigned

### Flow D — Admin menonaktifkan crew
1. Dari `/crew`, pilih crew → "Deactivate"
2. Konfirmasi (dialog: "Crew ini masih di-assign ke N project aktif — tetap nonaktifkan?" kalau ada assignment aktif)
3. `POST /functions/v1/update-crew` dengan `status: inactive`
4. Crew hilang dari picker assign, tapi assignment yang sudah ada tetap utuh

### Flow E — Melihat beban kerja crew *(fase 2, opsional)*
1. Buka detail crew → tab "Assignments"
2. Tampilkan list project yang sedang di-assign (perlu endpoint baru: `get-crew-assignments?crew_id=`)

---

## API yang Perlu Ditambahkan Backend

Mengikuti konvensi penamaan yang sudah dipakai di codebase ini (`POST /functions/v1/update-<entity>`, `GET /functions/v1/get-<entity>-paginated`):

| Endpoint | Method | Keterangan |
|---|---|---|
| `/functions/v1/get-crew-paginated` | GET | ✅ **Sudah ada**, dipakai untuk picker. Bisa dipakai ulang untuk list admin (tinggal tambah filter status kalau perlu) |
| `/functions/v1/create-crew` | POST | 🆕 Body: `{ name, role, company, ...}` — bentuk final tunggu konfirmasi data model |
| `/functions/v1/update-crew` | POST | 🆕 Body: `{ crew_id, ...fields }`, termasuk untuk deactivate (`status`) |
| `/functions/v1/get-crew-assignments` | GET | 🆕 (fase 2) Body/query: `crew_id` → list project yang sedang/pernah pakai crew ini |
| `/functions/v1/update-project-crew` | POST | ✅ **Sudah ada** — perlu klarifikasi apakah 1 call = replace assignment atau tambah (lihat pertanyaan kunci #4 di atas) |

---

## File Terkait (existing, untuk referensi implementasi nanti)

```
lib/api/crew.ts                                          ← getCrewPaginated, updateProjectCrew (tambahkan createCrew/updateCrew di sini)
lib/types/... (belum ada file crew.ts di lib/types)       ← perlu ditambahkan CrewMember, CrewStatus, dll.
app/(dashboard)/contract-preview/_components/left-panel.tsx  ← CrewAssignPicker, pola popup search+assign yang bisa direuse stylenya
app/(dashboard)/suppliers/                                ← preseden halaman admin list+CRUD serupa, jadi referensi struktur route/komponen untuk /crew
```

---

## Langkah Berikutnya

1. **Konfirmasi ke backend/product** 4 pertanyaan kunci di bagian Data Model (terutama: crew = individu atau tim?)
2. Backend implementasi `create-crew` & `update-crew`
3. FE: bangun route `/crew` (list + create/edit modal), reuse pola dari `/suppliers`
4. FE: tambahkan filter `status=active` di `CrewAssignPicker` supaya crew inactive tidak muncul di picker assign
5. (Fase 2) Detail crew + riwayat assignment
