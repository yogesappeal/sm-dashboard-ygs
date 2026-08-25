import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Must match the cookie name in lib/supabase/client.ts and proxy.ts — see
// the comment there for why this is customized.
const AUTH_COOKIE_NAME = 'sb-smweb-auth-token'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: AUTH_COOKIE_NAME },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookie mutations ignored
          }
        },
      },
    }
  )
}
