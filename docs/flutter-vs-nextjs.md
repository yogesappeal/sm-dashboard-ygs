# Flutter / FlutterFlow untuk Web Dashboard — Analisis & Rekomendasi

## Konteks

Document ini membahas pertimbangan teknis menggunakan **Flutter** atau **FlutterFlow** sebagai tech stack untuk membangun web dashboard seperti project ini (supplier management, purchase orders, contracts, tasks).

---

## Bagaimana Flutter Web Bekerja

Flutter web **tidak merender HTML DOM** seperti framework web pada umumnya. Ia menggunakan dua mode render:

- **CanvasKit** (default production) — semua UI digambar ke dalam `<canvas>` menggunakan WebAssembly. Browser hanya melihat satu elemen canvas kosong.
- **HTML renderer** — mencoba memetakan widget ke elemen HTML, tapi dengan banyak keterbatasan dan behavior yang tidak konsisten.

Ini adalah akar dari hampir semua masalah Flutter di web.

---

## Kenapa Flutter Web Tidak Direkomendasikan untuk Project Ini

### 1. Tidak Ada SEO
Flutter CanvasKit tidak menghasilkan HTML yang bisa dibaca search engine. Seluruh konten ada di dalam canvas. Untuk dashboard internal murni ini mungkin tidak masalah, tapi jika ada halaman yang perlu diindex (login, landing, dokumentasi), Flutter tidak bisa melakukannya tanpa solusi terpisah.

### 2. Initial Load Sangat Berat
Flutter web perlu mendownload WebAssembly engine (~2–4 MB) sebelum satu pixel pun tampil di layar. Bandingkan dengan Next.js yang bisa mengirim HTML yang sudah ter-render dari server (SSR) sehingga konten langsung muncul.

| | Flutter Web | Next.js |
|---|---|---|
| First render | ~3–8 detik (cold) | < 1 detik (SSR) |
| Bundle size minimum | ~2 MB | ~80 KB |
| Render ke HTML | Tidak | Ya |

### 3. Integrasi Ekosistem Web Sangat Terbatas
Project ini memanfaatkan ekosistem JavaScript/TypeScript yang sudah sangat mature:

| Kebutuhan | Di project ini (Next.js) | Di Flutter Web |
|---|---|---|
| Data fetching + cache | React Query | Tidak ada padanannya, harus manual |
| Form validation | Zod + React Hook Form | Tidak ada, harus buat sendiri |
| UI components | Radix UI, Tailwind | Harus buat dari scratch |
| Auth & DB | Supabase JS SDK (official) | `supabase_flutter` (lebih terbatas) |
| State management | Zustand | Provider / Riverpod (berbeda paradigma) |

### 4. Aksesibilitas dan Behavior Web Native Rusak
Karena render di canvas, hal-hal berikut bermasalah atau tidak bekerja sama sekali:
- **Copy-paste teks** — tidak selalu bisa diseleksi
- **Right-click browser** — tidak berfungsi normal
- **Accessibility (screen reader)** — sangat terbatas
- **Browser find (Ctrl+F)** — tidak bisa mencari teks di dalam canvas
- **Tab navigation** — tidak mengikuti standar web
- **Zoom browser** — bisa merusak layout

### 5. Debugging Jauh Lebih Sulit
Browser DevTools (Inspector, Network, Console) tidak bisa inspect elemen Flutter seperti biasa. Debugging UI harus dilakukan dari Flutter DevTools yang terpisah, dengan paradigma yang berbeda dari debugging web biasa.

### 6. Flutter Web Masih Second-Class di Google Sendiri
Secara resmi Google menyatakan Flutter web paling cocok untuk **web app yang interaktif dan bukan konten-heavy**. Untuk dashboard data yang penuh tabel, filter, form, dan pagination — ini bukan use case ideal Flutter web.

---

## Kenapa FlutterFlow Lebih Tidak Direkomendasikan Lagi

FlutterFlow adalah visual builder di atas Flutter, yang berarti semua masalah Flutter web di atas tetap ada, **ditambah** masalah baru:

### 1. Vendor Lock-in Ekstrem
Logic bisnis, UI, dan state management semuanya terikat ke platform FlutterFlow. Kalau butuh sesuatu yang tidak didukung, opsinya sangat terbatas.

### 2. Custom Logic Sangat Terbatas
Project ini punya logic yang cukup kompleks:
- Debounce search
- Pagination dengan filter kombinasi
- Mutation + invalidate query cache
- Form validation dengan Zod schema

Di FlutterFlow, semua ini harus diimplementasikan via "Custom Actions" (Dart code yang ditulis manual di dalam platform), yang menghilangkan keunggulan visual builder-nya.

### 3. Kualitas Output Kode Buruk
Kode yang di-generate FlutterFlow sulit di-maintain, penuh boilerplate, dan tidak mengikuti best practice Flutter standar. Kalau project berkembang dan butuh di-export, kodenya sulit dikelola.

### 4. Biaya
FlutterFlow berbasis subscription. Untuk fitur advanced (custom code, API integration, team collaboration) membutuhkan plan berbayar yang biayanya bisa signifikan untuk tim.

### 5. Ketergantungan Koneksi Internet
FlutterFlow adalah platform cloud. Development harus online, dan jika platform down, development berhenti.

---

## Rekomendasi: Kenapa Next.js + TypeScript

Ini bukan sekadar preferensi — ada alasan teknis konkret untuk project seperti ini:

### 1. SSR dan SSG untuk Performance
Next.js bisa merender halaman di server (SSR) atau saat build time (SSG). Hasilnya adalah HTML yang langsung bisa ditampilkan browser tanpa menunggu JS selesai diload.

### 2. Ekosistem yang Sudah Terbukti
Setiap kebutuhan project ini sudah ada solusinya yang mature, well-documented, dan aktif di-maintain:
- **Supabase** punya official JS SDK
- **React Query** untuk server state management
- **Tailwind CSS** untuk styling yang scalable
- **Zod** untuk type-safe validation

### 3. Developer Experience Terbaik untuk Web
- Browser DevTools bekerja penuh (inspect element, network tab, dll)
- TypeScript memberikan type safety dari API sampai UI
- Hot reload yang cepat
- Error message yang informatif

### 4. Fleksibilitas Tinggi
Next.js tidak memaksakan satu cara. Bisa SSR, CSR, API routes, middleware — semuanya bisa dikombinasikan sesuai kebutuhan per halaman.

### 5. Hiring dan Kolaborasi
React + TypeScript adalah kombinasi yang paling banyak dipahami developer web saat ini. Onboarding developer baru jauh lebih mudah dibanding Flutter web atau FlutterFlow.

---

## Kesimpulan

| Kriteria | Flutter Web | FlutterFlow | Next.js + TS |
|---|---|---|---|
| Performance web | ❌ Berat | ❌ Berat | ✅ Ringan |
| SEO | ❌ Tidak ada | ❌ Tidak ada | ✅ Full |
| Integrasi Supabase | ⚠️ Terbatas | ⚠️ Terbatas | ✅ Official SDK |
| Debugging | ⚠️ Sulit | ❌ Sangat sulit | ✅ Mudah |
| Aksesibilitas web | ❌ Rusak | ❌ Rusak | ✅ Native |
| Vendor lock-in | ⚠️ Sebagian | ❌ Tinggi | ✅ Tidak ada |
| Ekosistem | ⚠️ Terbatas | ❌ Sangat terbatas | ✅ Sangat kaya |
| Cocok untuk dashboard | ❌ | ❌ | ✅ |

**Gunakan Flutter/FlutterFlow jika:** kamu membangun aplikasi mobile cross-platform (iOS + Android) dan web hanya sebagai tambahan kecil yang tidak butuh SEO atau performance tinggi.

**Gunakan Next.js jika:** kamu membangun web dashboard, web app, atau produk yang primarily diakses dari browser — seperti project ini.
