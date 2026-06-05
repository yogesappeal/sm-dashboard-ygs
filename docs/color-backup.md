# Color Backup — Pre June 2026 Rebrand

Backup warna lama sebelum migrasi ke color scheme BaliCon (Slate Blue + Mustard Yellow).
Untuk rollback, ganti semua nilai baru kembali ke nilai di bawah ini.

---

## CSS Variables (`app/globals.css`)

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #C66EEB;
  --primary-dark: #A855D4;
  --sidebar-bg: #1a1a2e;
  --sidebar-text: #e2e8f0;
  --sidebar-active: #C66EEB;
}
```

---

## Hex Colors (Inline Tailwind)

| Warna | Hex | Dipakai untuk |
|---|---|---|
| Primary Brand | `#C66EEB` | Tombol utama, active state, focus ring, icon, teks brand |
| Primary Dark (hover) | `#A855D4` | hover:bg pada tombol utama |
| Sidebar Background | `#1a1a2e` | Sidebar desktop + mobile bg |
| Sidebar Gradient End | `#2d1b4e` | Welcome card gradient (`to-[#2d1b4e]`) |
| User Menu Floating | `#12122a` | User footer floating menu bg |

---

## Tailwind Utility Classes (Brand Usage)

| Class | Lokasi | Keterangan |
|---|---|---|
| `bg-[#C66EEB]/20 text-[#C66EEB] border-[#C66EEB]/30` | `sidebar.tsx:61` | Nav active state |
| `ring-2 ring-[#C66EEB]/30` | `sidebar.tsx:179` | Avatar ring |
| `bg-[#C66EEB]/30` | `sidebar.tsx:182` | Avatar initials bg |
| `hover:border-[#C66EEB]/50` | `metric-card.tsx:21` | Metric card hover border |
| `bg-[#C66EEB]/10 border-[#C66EEB]/40` | `metric-card.tsx:23` | Metric card active bg |
| `text-[#C66EEB]` | `metric-card.tsx:34,39,65` | Metric value text |
| `bg-gradient-to-br from-[#1a1a2e] to-[#2d1b4e]` | `welcome-card.tsx:44,67` | Welcome card background |
| `ring-2 ring-purple-100` | `header.tsx:78` | Avatar image ring |
| `bg-purple-50 border border-purple-100` | `header.tsx:81` | Avatar initials bg |
| `bg-purple-50 text-[#C66EEB]` | `task-card.tsx:328` | Category pill |
| `hover:bg-purple-50/50` | `task-quick-add.tsx:72` | Add task hover |
| `border-[#C66EEB]/20 bg-purple-50/30` | `task-quick-add.tsx:81` | Quick add expanded bg |
| `bg-[#C66EEB]` | various | Checkbox filled, tombol submit |

---

## Colors Yang TIDAK Berubah (Semantik)

| Class | Dipakai untuk | Alasan tetap |
|---|---|---|
| `bg-purple-50 text-purple-600` | StatusBadge: 'Preparation', 'subcontractor' | Semantik (bukan brand) |
| `bg-blue-50 text-blue-600` | StatusBadge: 'supplier', 'PO Submitted', default | Semantik |
| `bg-green-*` | StatusBadge: Active, Completed, PO Sent | Semantik |
| `bg-yellow-*` | StatusBadge: Deposit, PO Draft | Semantik |
| `bg-red-*` | StatusBadge: Lost, PO Rejected | Semantik |
| `bg-purple-50 text-purple-600` | ScopeSlideOver type pill: Subcontractor | Semantik |
| `bg-blue-50 text-blue-600` | ScopeSlideOver type pill: Supplier | Semantik |
