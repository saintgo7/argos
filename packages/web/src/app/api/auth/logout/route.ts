import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/auth/logout
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth

    // requireAuth가 통과했다면 Authorization 헤더는 반드시 'Bearer ...' 형식이다.
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.substring(7)
    const tokenHash = createHash('sha256').update(token).digest('hex')

    await db.cliToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
