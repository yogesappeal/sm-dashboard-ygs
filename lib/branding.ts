// Single source of truth for company-specific branding, resolved at
// build/render time from NEXT_PUBLIC_* env vars baked in per deployment.
// A second company deployment only needs a different .env — no component
// code should hardcode a company name, logo URL, or brand color.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

export const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY ?? 'AusHail'
export const COMPANY_ALT_TEXT = COMPANY_NAME
export const COMPANY_LOGO_ALT_TEXT = `${COMPANY_NAME} Construction`
export const SITE_TITLE = `SM Dashboard - ${COMPANY_NAME}`

const LOGO_FULL_PATH = process.env.NEXT_PUBLIC_LOGO_FULL_PATH ?? '/assets/company-logos/logo_ah.png'
const LOGO_MINI_PATH = process.env.NEXT_PUBLIC_LOGO_MINI_PATH ?? '/assets/company-logos/mini_logo_ah.png'
const BG_IMAGE_PATH = process.env.NEXT_PUBLIC_BG_IMAGE_PATH ?? '/assets/background/image-cover.jpg'

export const LOGO_FULL_URL = `${SUPABASE_URL}/storage/v1/object/public${LOGO_FULL_PATH}`
export const LOGO_MINI_URL = `${SUPABASE_URL}/storage/v1/object/public${LOGO_MINI_PATH}`
export const BG_IMAGE_URL = `${SUPABASE_URL}/storage/v1/object/public${BG_IMAGE_PATH}`

const BRAND_COLOR_VARS: Record<string, string> = {
  '--primary': process.env.NEXT_PUBLIC_PRIMARY_COLOR ?? '#6692C5',
  '--primary-dark': process.env.NEXT_PUBLIC_PRIMARY_DARK_COLOR ?? '#4F7CB3',
  '--primary-hover': process.env.NEXT_PUBLIC_PRIMARY_HOVER_COLOR ?? '#5a82b3',
  '--primary-secondary': process.env.NEXT_PUBLIC_SECONDARY_COLOR ?? '#D3BE39',
  '--primary-secondary-dark': process.env.NEXT_PUBLIC_SECONDARY_DARK_COLOR ?? '#B8A42A',
  '--sidebar-active': process.env.NEXT_PUBLIC_PRIMARY_COLOR ?? '#6692C5',
}

export function getBrandCssVars(): string {
  return Object.entries(BRAND_COLOR_VARS)
    .map(([key, value]) => `${key}:${value}`)
    .join(';')
}
