# Company Branding

Each deployment (one per company) is built with its own `.env`. Every brand
color, logo, and the company display name is centralized so a second
company build only requires editing env vars plus one static image file —
no component code should ever hardcode a company name, hex color, or logo
URL again.

## How it works

- `app/globals.css` defines the brand palette as CSS custom properties
  (`--primary`, `--primary-dark`, etc.), exposed as Tailwind utilities
  (`bg-primary`, `text-primary-dark`, ...) via `@theme inline`. Components
  use these semantic classes, never raw hex.
- `app/layout.tsx` injects a `<style>` tag in `<head>` that overrides those
  CSS variables at build/render time, reading values from `NEXT_PUBLIC_*`
  env vars via `lib/branding.ts`'s `getBrandCssVars()`.
- `lib/branding.ts` is the single module for company name, logo URLs, and
  brand colors — every call site imports from here.
- `app/icon.tsx` (browser-tab favicon) is a dynamic Next.js icon route that
  fetches `LOGO_MINI_URL` at build time — it automatically follows
  `NEXT_PUBLIC_LOGO_MINI_PATH`, no separate favicon file needed.

## Env vars (per deployment)

```
NEXT_PUBLIC_COMPANY=AusHail

NEXT_PUBLIC_PRIMARY_COLOR=#6692C5
NEXT_PUBLIC_PRIMARY_DARK_COLOR=#4F7CB3
NEXT_PUBLIC_PRIMARY_HOVER_COLOR=#5a82b3
NEXT_PUBLIC_SECONDARY_COLOR=#D3BE39
NEXT_PUBLIC_SECONDARY_DARK_COLOR=#B8A42A

NEXT_PUBLIC_LOGO_FULL_PATH=/assets/company-logos/logo_ah.png
NEXT_PUBLIC_LOGO_MINI_PATH=/assets/company-logos/mini_logo_ah.png

NEXT_PUBLIC_BG_IMAGE_PATH=/assets/background/image-cover.jpg
```

If any of these are omitted, `lib/branding.ts` falls back to AusHail's
current values, so a deployment never breaks from a missing var.

## Static assets — manual per-deployment swap

`public/og-image.png` (social share / Open Graph / Twitter card image) is a
Next.js file-convention asset and **cannot be env-driven**; replace its
contents before running `next build` for a second company. (The favicon no
longer needs this — see `app/icon.tsx` above.)

## Standing up a second company deployment

1. Copy `.env.local` to the new deployment's env config.
2. Set `NEXT_PUBLIC_COMPANY` and the 8 brand-color/logo/background vars
   above to the new company's values (make sure `logo_mini_*.png` exists at
   the path you set — it's also used for the favicon).
3. Replace `public/og-image.png` with the new company's social share image.
4. `npm run build`.

## Baseline (AusHail) values

For reference, the values above are AusHail's current palette. See
`docs/color-backup.md` for the pre-AusHail (purple "BaliCon") palette this
replaced.
