import { LOGO_MINI_URL } from '@/lib/branding'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default async function Icon() {
  const res = await fetch(LOGO_MINI_URL)
  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    headers: { 'Content-Type': contentType },
  })
}
