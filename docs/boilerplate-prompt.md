# Boilerplate Prompt — sm_dashboard_web sebagai Referensi Stack

Prompt siap pakai untuk memulai project baru dengan stack dan konvensi yang sama seperti `sm_dashboard_web`. Tinggal copy-paste, isi bagian `[...]`, dan berikan ke Claude Code / agent lain di awal project baru.

Lihat juga [tech-stack.md](tech-stack.md) untuk penjelasan detail tiap layer beserta kelebihan/kekurangannya.

---

## Prompt

```
Bangun project [NAMA_PROJECT_BARU] menggunakan stack dan konvensi yang sama dengan sm_dashboard_web:

STACK:
- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4 (config berbasis CSS, bukan tailwind.config.js)
- Radix UI primitives + class-variance-authority + clsx + tailwind-merge untuk komponen di components/ui/
- Supabase untuk Auth & Storage saja — SEMUA data request lewat Supabase Edge Functions via custom fetcher wrapper (lib/api/fetcher.ts), bukan Supabase client langsung di frontend
- TanStack React Query v5 untuk server state (staleTime per query, invalidateQueries untuk refresh)
- Zustand v5 untuk client state (tanpa Provider, tanpa persist ke localStorage kecuali di-setup manual)
- React Hook Form + Zod (via @hookform/resolvers) untuk semua form

STRUKTUR FOLDER:
- app/ dengan route groups: (auth), (dashboard atau nama sesuai domain), (public)
- proxy.ts di root sebagai middleware Next.js untuk auth guard (redirect unauthenticated ke /login, redirect authenticated dari auth routes)
- lib/api/ — satu file per domain entity, semua fetch API di sini
- lib/store/ — satu file Zustand store per concern (auth-store, app-store, dst)
- lib/types/ — shared TypeScript types
- lib/hooks/ — custom React Query hooks
- components/ui/ — primitive components (Radix-based)
- components/{cards,forms,layout,tables,shared}/ — komponen per kategori

KONVENSI:
- Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_COMPANY, feature flags via NEXT_PUBLIC_FEATURE_*
- Role-based views via env var (mis. NEXT_PUBLIC_ROLE_SM / NEXT_PUBLIC_ROLE_OPS)
- Tidak ada app/api/ Next.js — backend logic 100% di Supabase Edge Functions
- Auth token disimpan di Zustand store, di-hydrate saat app load

Tolong scaffold [FITUR SPESIFIK YANG DIMINTA] mengikuti pola di atas.
```

---

## Catatan Penggunaan

- Ganti `[NAMA_PROJECT_BARU]` dan `[FITUR SPESIFIK YANG DIMINTA]` sesuai kebutuhan.
- Kalau project baru tidak pakai Supabase Edge Functions (mis. langsung Next.js API Routes), hapus/ubah baris terkait "Supabase untuk Auth & Storage saja" dan "Tidak ada app/api/".
- Stack ini belum ada testing setup (tidak ada Jest/Vitest/Playwright) — tambahkan instruksi eksplisit di prompt kalau project baru butuh test coverage sejak awal.
- Next.js 16 masih tergolong bleeding edge — cek `node_modules/next/dist/docs/` di project baru untuk breaking changes sebelum menulis kode (lihat AGENTS.md).
