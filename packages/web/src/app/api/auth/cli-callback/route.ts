import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'
import { signJwt } from '@/lib/server/jwt'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/auth/cli-callback
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    let body: { state: string; denied?: boolean }
    try {
      body = (await req.json()) as { state: string; denied?: boolean }
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { state, denied } = body

    let request
    try {
      request = await db.cliAuthRequest.findUnique({ where: { state } })
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!request || new Date() > request.expiresAt) {
      return NextResponse.json({ error: 'Invalid or expired request' }, { status: 400 })
    }

    if (denied) {
      await db.cliAuthRequest
        .update({ where: { state }, data: { denied: true } })
        .catch(() => {})
      return NextResponse.json({ ok: true })
    }

    // 새 JWT 발급 및 CliToken 등록
    try {
      const token = await signJwt(userId)
      const tokenHash = createHash('sha256').update(token).digest('hex')
      await db.cliToken.create({ data: { userId, tokenHash } })
      await db.cliAuthRequest.update({
        where: { state },
        data: { approved: true, token },
      })
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
