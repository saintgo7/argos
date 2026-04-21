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

    const authUrl = `${req.nextUrl.origin}/cli-auth?state=${state}`
    return NextResponse.json({ state, authUrl })
  } catch (err) {
    return handleRouteError(err)
  }
}
