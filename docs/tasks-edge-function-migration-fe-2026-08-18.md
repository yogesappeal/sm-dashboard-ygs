# Migration Guide: Task Edge Functions -> `/tasks`

**Breaking change — hard cutover.** `insert-task`, `update-task`,
`task-status`, `task-priority` sudah **dihapus** dari project dev
(`exlknzxmmqnehvximbyj`). Semua operasi task sekarang lewat 1 edge
function `tasks`, dibedakan lewat method HTTP + path (REST), bukan nama
function terpisah. FE wajib update sebelum deploy berikutnya — endpoint
lama akan 404.

Base URL dev: `https://exlknzxmmqnehvximbyj.supabase.co/functions/v1`.

## Ringkasan perubahan

| Sebelum | Sesudah |
|---|---|
| `POST /insert-task` | `POST /tasks` |
| `POST /update-task` | `PATCH /tasks/{task_id}` |
| `POST /task-status` | `PATCH /tasks/{task_id}/status` |
| `POST /task-priority` | `PATCH /tasks/{task_id}/priority` |
| `GET /tasks` (query params) | `GET /tasks` — **tidak berubah** |
| `GET /tasks/{id}` | `GET /tasks/{id}` — **tidak berubah** |
| `GET /tasks/{id}/history` | `GET /tasks/{id}/history` — **tidak berubah** |

Perubahan tambahan yang berlaku untuk **semua** route (termasuk yang GET,
yang URL-nya tidak berubah):
- **`task_id` pindah dari body ke URL path** untuk update/status/priority
  — jangan dikirim lagi di body.
- **Response format diseragamkan** jadi `{ "success": true, "data": ... }`
  / `{ "success": false, "error": "..." }` untuk semua route. Sebelumnya
  ada 2 format berbeda (lihat detail per endpoint di bawah) — kalau kode
  FE membaca `response.message` atau `response.meta.total`, itu sekarang
  **tidak ada lagi**.

## Detail per endpoint

### 1. Insert task

**Sebelum**: `POST /insert-task`
**Sesudah**: `POST /tasks`

Body **tidak berubah**:
```json
{
  "title": "Fix leaking pipe",
  "description": "...",
  "due_date": "2026-08-20",
  "priority": true,
  "assignee": "uuid",
  "parent_task_id": null,
  "project_id": "uuid",
  "category": "maintenance",
  "status": "open",
  "project_name": "..."
}
```

Response sebelum: `{ "data": { "id": "...", ... } }`
Response sesudah: `{ "success": true, "data": { "id": "...", ... } }`

### 2. Update task (full)

**Sebelum**: `POST /update-task`, body termasuk `task_id`
**Sesudah**: `PATCH /tasks/{task_id}`, `task_id` **dihapus dari body**, pindah ke URL

Body sebelum:
```json
{ "task_id": "uuid", "title": "...", "status": "done", "...": "..." }
```
Body sesudah (`PATCH /tasks/uuid`):
```json
{ "title": "...", "status": "done", "...": "..." }
```

Response sebelum: `{ "data": { ...updated task... } }`
Response sesudah: `{ "success": true, "data": { ...updated task... } }`

### 3. Update task status

**Sebelum**: `POST /task-status`, body `{ "task_id", "status" }`
**Sesudah**: `PATCH /tasks/{task_id}/status`, body `{ "status" }`

Response sukses sebelum: `{ "success": true, "message": "Task status successfully updated", "data": { "updated": true } }`
Response sukses sesudah: `{ "success": true, "data": { "updated": true } }`

Response not-found sebelum (HTTP 404): `{ "error": "Task not found or not updated" }`
Response not-found sesudah (HTTP 404): `{ "success": false, "error": "Task not found or not updated" }`

### 4. Update task priority

**Sebelum**: `POST /task-priority`, body `{ "task_id", "priority" }`
**Sesudah**: `PATCH /tasks/{task_id}/priority`, body `{ "priority" }`

Response sebelum: `{ "data": <hasil RPC> }`
Response sesudah: `{ "success": true, "data": <hasil RPC> }`

### 5. List tasks — URL tidak berubah, response berubah

`GET /tasks?project=&status=&category=&only_parent=&is_active=&priority=`

Response sebelum:
```json
{ "success": true, "message": "Tasks fetched successfully", "data": [ ... ], "meta": { "total": 12 } }
```
Response sesudah:
```json
{ "success": true, "data": [ ... ] }
```
(`message` dan `meta.total` sudah tidak ada — kalau FE butuh total count, hitung dari `data.length`.)

### 6. Get task by id — URL tidak berubah, response berubah

`GET /tasks/{id}`

Response sebelum: `{ "success": true, "message": "Task fetched successfully", "data": {...}, "meta": {} }`
Response sesudah: `{ "success": true, "data": {...} }`

Not-found sebelum (404): `{ "success": false, "message": "Task not found", "data": null, "meta": {} }`
Not-found sesudah (404): `{ "success": false, "error": "Task not found" }`

### 7. Get task history — URL tidak berubah, response berubah

`GET /tasks/{id}/history`

Response sebelum: `{ "success": true, "message": "Task history fetched successfully", "data": [...], "meta": { "total": 5 } }`
Response sesudah: `{ "success": true, "data": [...] }`

## Checklist untuk FE

- [ ] Ganti semua pemanggilan `POST /insert-task` -> `POST /tasks`
- [ ] Ganti semua pemanggilan `POST /update-task` -> `PATCH /tasks/{task_id}`, hapus `task_id` dari body
- [ ] Ganti semua pemanggilan `POST /task-status` -> `PATCH /tasks/{task_id}/status`, hapus `task_id` dari body
- [ ] Ganti semua pemanggilan `POST /task-priority` -> `PATCH /tasks/{task_id}/priority`, hapus `task_id` dari body
- [ ] Update semua parsing response (7 endpoint di atas) ke `{success, data}` / `{success:false, error}` — hapus akses ke `response.message` dan `response.meta`
- [ ] Test end-to-end di dev sebelum deploy ke production
