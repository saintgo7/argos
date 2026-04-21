import { NextResponse } from 'next/server'
import { LoginRequestSchema } from '@argos/shared'
import { loginUser } from '@/lib/server/auth-actions'
import { handleRouteError } from '@/lib/server/error-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/auth/login
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const input = LoginRequestSchema.parse(body)

    const result = await loginUser(input)
    if (!result) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    return NextResponse.json(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
