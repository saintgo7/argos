import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'
import { assertOrgAccessBySlugOrResponse } from '@/lib/server/dashboard-route-helper'
import { canManageOrg, canDeleteOrg, forbiddenByRole } from '@/lib/server/rbac'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UpdateRoleSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER', 'MEMBER', 'VIEWER']),
})

// PATCH /api/orgs/:orgSlug/members/:memberUserId
// 멤버 역할 변경. Manager+ 만 가능. OWNER 지정/해제는 OWNER만.
// 조직에는 최소 1명의 OWNER 또는 MANAGER가 남아있어야 함.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; memberUserId: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId: actorId } = auth

    const { orgSlug, memberUserId } = await params

    const access = await assertOrgAccessBySlugOrResponse(orgSlug, actorId)
    if (access instanceof NextResponse) return access

    if (!canManageOrg(access.role)) {
      return forbiddenByRole(access.role, 'MANAGER 이상')
    }

    const body = await req.json()
    const { role: nextRole } = UpdateRoleSchema.parse(body)

    // OWNER 역할 배정/해제는 OWNER만 가능
    const target = await db.orgMembership.findUnique({
      where: { userId_orgId: { userId: memberUserId, orgId: access.org.id } },
      select: { id: true, role: true },
    })
    if (!target) {
      return NextResponse.json({ error: '해당 멤버가 존재하지 않습니다.' }, { status: 404 })
    }

    const ownershipChange = target.role === 'OWNER' || nextRole === 'OWNER'
    if (ownershipChange && !canDeleteOrg(access.role)) {
      return NextResponse.json(
        { error: 'forbidden', message: 'OWNER 역할 변경은 OWNER만 가능합니다.' },
        { status: 403 }
      )
    }

    // 마지막 OWNER/MANAGER 강등 방지
    if (
      (target.role === 'OWNER' || target.role === 'MANAGER') &&
      nextRole !== 'OWNER' &&
      nextRole !== 'MANAGER'
    ) {
      const adminCount = await db.orgMembership.count({
        where: {
          orgId: access.org.id,
          role: { in: ['OWNER', 'MANAGER'] },
        },
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: '최소 1명의 OWNER 또는 MANAGER가 필요합니다.' },
          { status: 400 }
        )
      }
    }

    await db.orgMembership.update({
      where: { id: target.id },
      data: { role: nextRole },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}

// DELETE /api/orgs/:orgSlug/members/:memberUserId
// 멤버 추방. Manager+ 만 가능. OWNER는 OWNER만 추방 가능.
// 마지막 OWNER/MANAGER 추방 방지.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgSlug: string; memberUserId: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId: actorId } = auth

    const { orgSlug, memberUserId } = await params

    const access = await assertOrgAccessBySlugOrResponse(orgSlug, actorId)
    if (access instanceof NextResponse) return access

    if (!canManageOrg(access.role)) {
      return forbiddenByRole(access.role, 'MANAGER 이상')
    }

    const target = await db.orgMembership.findUnique({
      where: { userId_orgId: { userId: memberUserId, orgId: access.org.id } },
      select: { id: true, role: true },
    })
    if (!target) {
      return NextResponse.json({ error: '해당 멤버가 존재하지 않습니다.' }, { status: 404 })
    }

    if (target.role === 'OWNER' && !canDeleteOrg(access.role)) {
      return NextResponse.json(
        { error: 'forbidden', message: 'OWNER 추방은 OWNER만 가능합니다.' },
        { status: 403 }
      )
    }

    if (target.role === 'OWNER' || target.role === 'MANAGER') {
      const adminCount = await db.orgMembership.count({
        where: {
          orgId: access.org.id,
          role: { in: ['OWNER', 'MANAGER'] },
        },
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: '최소 1명의 OWNER 또는 MANAGER가 필요합니다.' },
          { status: 400 }
        )
      }
    }

    await db.orgMembership.delete({ where: { id: target.id } })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return handleRouteError(err)
  }
}
