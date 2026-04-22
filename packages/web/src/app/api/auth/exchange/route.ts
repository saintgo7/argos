import { NextResponse } from 'next/server'
import { ExchangeRequestSchema } from '@argos/shared'
import { exchangeOnboardToken } from '@/lib/server/auth-actions'
import { handleRouteError } from '@/lib/server/error-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/auth/exchange
// 가입 직후 발급된 onboard token을 소비해 long-lived CLI JWT로 교환한다.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { onboardToken } = ExchangeRequestSchema.parse(body)

    const result = await exchangeOnboardToken(onboardToken)

    if (result === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }
    if (result === 'EXPIRED') {
      return NextResponse.json({ error: 'Token expired' }, { status: 410 })
    }
    if (result === 'ALREADY_USED') {
      return NextResponse.json({ error: 'Token already used' }, { status: 409 })
    }

    return NextResponse.json(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
