import { createBrowserClient } from '@supabase/ssr'

// Custom cookie name so a locally-run second app (e.g. an admin console)
// sharing this same Supabase project doesn't silently inherit this app's
// session — cookies are scoped by domain only, not port, so on localhost
// both apps would otherwise read/write the same default
// `sb-<project-ref>-auth-token` cookie. Must match the name used in
// lib/supabase/server.ts and proxy.ts (same app, same session).
const AUTH_COOKIE_NAME = 'sb-smweb-auth-token'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { name: AUTH_COOKIE_NAME } }
  )
}
