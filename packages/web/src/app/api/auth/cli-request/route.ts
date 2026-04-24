import { randomBytes } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/server/db'
import { handleRouteError } from '@/lib/server/error-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/auth/cli-request
export async function POST(req: NextRequest) {
  try {
    const state = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15분

    await db.cliAuthRequest.create({ data: { state, expiresAt } })

    // Behind a reverse proxy (nginx / Cloudflare Tunnel), Next.js standalone
    // derives `req.nextUrl.origin` from the container's HOSTNAME+PORT env
    // vars (e.g. http://0.0.0.0:3000) rather than the public URL the client
    // reached. Prefer NEXT_PUBLIC_SITE_URL when set, fall back to the
    // X-Forwarded-* headers, and only use nextUrl.origin as a last resort.
    const forwardedHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
    const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https'
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin)
    const authUrl = `${baseUrl}/cli-auth?state=${state}`
    return NextResponse.json({ state, authUrl })
  } catch (err) {
    return handleRouteError(err)
  }
}
