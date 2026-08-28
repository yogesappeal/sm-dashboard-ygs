import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Must match the cookie name in lib/supabase/client.ts and server.ts — see
// the comment there for why this is customized.
const AUTH_COOKIE_NAME = 'sb-smweb-auth-token'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
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
  // Contract Preview, Profile, Settings, Notifications). Restore access by
  // removing this block (sidebar entries are commented out separately in
  // components/layout/sidebar.tsx).
  const isBillsRoute =
    request.nextUrl.pathname === '/bills' ||
    request.nextUrl.pathname.startsWith('/bills/')
  if (user && !isAuthRoute && !isPublicRoute && !isBillsRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/bills'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
}
