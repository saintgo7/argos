import { NextRequest, NextResponse } from 'next/server'
import { auth } from './auth'
import type { Session } from 'next-auth'

// Run middleware on the Node.js runtime (Next.js 15+ stable) so auth.ts can
// safely import bcrypt/Prisma/crypto via @/lib/server/auth-actions without
// triggering Edge Runtime warnings. The module graph reaches Node-only code
// even through lazy dynamic imports because webpack bundles it as part of
// the middleware's chunk set.
export const runtime = 'nodejs'

type AuthedRequest = NextRequest & { auth: Session | null }

export default auth((req) => {
  const request = req as unknown as AuthedRequest
  const isLoggedIn = !!request.auth
  const pathname = request.nextUrl?.pathname ?? request.url
  const isProtected = pathname.startsWith('/dashboard')

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', request.nextUrl?.origin ?? request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
