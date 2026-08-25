# Tech Stack — sm_dashboard_web

## Stack yang Digunakan

| Kategori | Teknologi | Versi |
|---|---|---|
| Framework | Next.js | 16.2.6 |
| UI Library | React | 19.2.4 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS | ^4 |
| Backend / BaaS | Supabase | ^2.106 |
| Server State | TanStack React Query | ^5.100 |
| Client State | Zustand | ^5 |
| Form | React Hook Form + Zod | ^7.77 + ^4.4 |
| Component Primitives | Radix UI | berbagai versi |
| Icons | Lucide React | ^1.17 |
| Date Utility | date-fns | ^4.4 |
| Style Utility | clsx + tailwind-merge + CVA | latest |

---

## Penjelasan Per Layer

### Next.js 16 (App Router)
Framework utama. Menggunakan App Router (`app/` directory) dengan layout nesting, route groups `(auth)` dan `(dashboard)`, dan `'use client'` directive untuk komponen interaktif.

### Supabase
Digunakan sebagai backend-as-a-service. Project ini **tidak menggunakan Supabase client secara langsung di frontend** — semua data request diarahkan ke **Supabase Edge Functions** (`/functions/v1/...`) via custom `api` fetcher. Auth dikelola via token JWT yang disimpan di Zustand store (`useAuthStore`).

### TanStack React Query
Mengelola semua server state: fetching, caching, refetching, dan invalidation. `staleTime` di-set per query (biasanya 2–5 menit). Mutation (`useMutation`) digunakan untuk create/update.

### Zustand
Client state yang persisten dalam satu session: auth token (`useAuthStore`), draft scope items (`useScopeStore`). Ringan dan tidak memerlukan Provider wrapper.

### React Hook Form + Zod
Form state dan validasi. RHF mengelola field state dan submission, Zod digunakan untuk schema validation via `@hookform/resolvers`.

### Radix UI
Komponen headless yang accessible (dialog, dropdown, toast, dll). Tidak membawa style bawaan — semua styling via Tailwind.

### Tailwind CSS v4
Utility-first CSS. Versi 4 menggunakan konfigurasi berbasis CSS (bukan `tailwind.config.js`), diproses via `@tailwindcss/postcss`.

---

## Kelebihan Stack Ini

**Next.js App Router**
- Route grouping rapi — `(auth)` dan `(dashboard)` memiliki layout terpisah tanpa URL prefix
- Server Components memungkinkan streaming dan layout yang efisien
- File-based routing mengurangi boilerplate konfigurasi router

**Supabase**
- Setup backend sangat cepat — auth, database, storage, dan edge functions dalam satu platform
- Edge Functions berjalan dekat dengan user (low latency)
- Realtime subscription tersedia jika dibutuhkan nanti
- Free tier cukup untuk development dan staging

**TanStack React Query**
- Cache otomatis — tidak perlu tulis logic loading/error/refetch manual
- `invalidateQueries` membuat optimistic update dan refresh sangat mudah
- DevTools bawaan membantu debug state data

**Zustand**
- Boilerplate minimal dibanding Redux
- Tidak perlu Provider — bisa diakses di mana saja
- Bundle size sangat kecil (~1KB)

**React Hook Form + Zod**
- Re-render minimal dibanding controlled inputs biasa
- Schema Zod bisa di-share antara frontend dan backend (Edge Functions juga TypeScript)
- Error message terpusat di schema

**Radix UI**
- Accessible by default (keyboard nav, ARIA attributes, focus trap)
- Headless — bebas styling tanpa override CSS framework orang lain
- Composable dan konsisten

**TypeScript + Tailwind v4**
- Type safety end-to-end dari API response hingga komponen
- Tailwind v4 lebih cepat build dan konfigurasi lebih sederhana (CSS-native)

---

## Kekurangan & Risiko Stack Ini

**Next.js 16 (versi bleeding edge)**
- Dokumentasi komunitas masih tipis untuk fitur-fitur baru App Router
- Breaking changes lebih sering — upgrade bisa butuh effort
- Beberapa library pihak ketiga belum kompatibel penuh dengan React 19 + Next.js 16

**Supabase Edge Functions sebagai API layer**
- Logic bisnis tersebar di dua tempat: frontend (`lib/api/`) dan edge functions
- Debugging edge functions lebih susah dibanding API routes lokal
- Cold start bisa terjadi jika function jarang dipakai
- Tightly coupled ke vendor Supabase — migrasi ke backend lain butuh effort besar

**TanStack React Query**
- Cache invalidation bisa jadi kompleks saat banyak query saling bergantung
- `queryKey` yang tidak konsisten menyebabkan stale data atau over-fetching
- Learning curve untuk pola optimistic update yang benar

**Zustand**
- Tidak ada devtools sekuat Redux DevTools untuk time-travel debugging
- State tidak persist ke localStorage by default — refresh halaman reset semua state (termasuk auth token jika tidak di-hydrate dengan benar)

**Radix UI**
- Bundle size bisa membengkak jika banyak primitif diimport sekaligus
- Setiap komponen adalah package terpisah — dependency tree cepat besar (lihat 10+ `@radix-ui/*` di package.json)

**Tidak ada testing setup**
- Tidak ada unit test, integration test, atau E2E test (tidak ada Jest, Vitest, Playwright, atau Cypress di package.json)
- Risiko regresi tinggi saat codebase berkembang

**Tailwind v4 (masih baru)**
- Ekosistem plugin belum semua support v4
- Berbeda signifikan dari v3 — dokumentasi dan contoh komunitas masih banyak yang v3

---

## Catatan Arsitektur

- **Semua request ke API** melalui `lib/api/fetcher.ts` yang meng-wrap `fetch` dengan token header — tidak ada Supabase JS client di layer frontend selain untuk auth.
- **Auth token** disimpan di Zustand `useAuthStore` — perlu pastikan hydration dari cookie/localStorage saat app pertama load agar tidak logout saat refresh.
- **Tidak ada API Routes Next.js** (`app/api/`) — semua backend logic ada di Supabase Edge Functions.
