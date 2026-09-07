import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Must match the cookie name in lib/supabase/client.ts and server.ts — see
// the comment there for why this is customized.
const AUTH_COOKIE_NAME = 'sb-smweb-auth-token'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { name: AUTH_COOKIE_NAME },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password')

  // Public, no-login pages — reached via emailed magic links (supplier/
  // subcontractor accepting/rejecting/rescheduling a PO), never gated by
  // Supabase auth in either direction.
  const isPublicRoute = request.nextUrl.pathname.startsWith('/po-response')

  // Redirect unauthenticated users to login
  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    // Preserve the deep link's own query string (e.g. ?bill=<id> on a
    // Bills approval link) as part of `redirectTo`, not just the pathname
    // — otherwise post-login always lands on the bare list view instead of
    // the specific bill the link pointed at. `url.search` is cleared
    // first since it still carries the original request's query params
    // (cloned along with the pathname) — those get folded into the single
    // `redirectTo` value below instead of floating alongside it.
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Bills-only lockdown — every other authenticated page is temporarily
  // unreachable, including by typing the URL directly (Home "/",
  // Purchase Orders, Suppliers & Subs, Scope, Tasks, Contract,
  // Contract Preview, Notifications). Profile and Settings are exempted
  // (see their buttons re-enabled in components/layout/sidebar.tsx).
  // Restore access to the rest by removing this block.
  const isBillsRoute =
    request.nextUrl.pathname === '/bills' ||
    request.nextUrl.pathname.startsWith('/bills/')
  const isProfileRoute = request.nextUrl.pathname.startsWith('/profile')
  const isSettingsRoute = request.nextUrl.pathname.startsWith('/settings')
  if (user && !isAuthRoute && !isPublicRoute && !isBillsRoute && !isProfileRoute && !isSettingsRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/bills/requires-my-approval'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // icon/apple-icon are Next.js's dynamic favicon routes (app/icon.tsx) —
    // no file extension in the URL, so they need an explicit exclusion
    // alongside the static-asset extensions below.
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
}
