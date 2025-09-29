import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  const res = NextResponse.next()

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value
        },
        set(name, value, options) {
          // If the cookie is removed, `value` is ""
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          // If the cookie is removed, `value` is ""
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // if user is not signed in and the current path is not /login or /signup, redirect the user to /login
  if (!user && req.nextUrl.pathname !== '/login' && req.nextUrl.pathname !== '/signup' && req.nextUrl.pathname !== '/reset-password' && req.nextUrl.pathname !== '/update-password') {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    // Exclude API routes and auth pages from middleware
    '/((?!_next/static|_next/image|favicon.ico|api|login|signup|reset-password|update-password).*)',
  ],
}