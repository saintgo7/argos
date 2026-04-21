import { NextResponse } from 'next/server'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/orgs/:orgId/members
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { orgId } = await params

    // 이미 멤버인지 확인 (멱등성)
    const existingMembership = await db.orgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } },
    })

    if (existingMembership) {
      return NextResponse.json({ ok: true })
    }

    // OrgMembership(MEMBER) 생성
    await db.orgMembership.create({
      data: {
        userId,
        orgId,
        role: 'MEMBER',
      },
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    return handleRouteError(err)
  }
}
