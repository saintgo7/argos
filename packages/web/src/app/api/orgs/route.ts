import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'
import { generateUniqueOrgSlug } from '@/lib/server/slug'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CreateOrgSchema = z.object({
  name: z.string().min(1),
})

// GET /api/orgs
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const memberships = await db.orgMembership.findMany({
      where: { userId },
      include: { organization: true },
    })

    const orgs = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
    }))

    return NextResponse.json({ orgs })
  } catch (err) {
    return handleRouteError(err)
  }
}

// POST /api/orgs
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const body = await req.json()
    const { name } = CreateOrgSchema.parse(body)

    // slug 생성 (중복 방지)
    const slug = await generateUniqueOrgSlug(name)

    // 트랜잭션: Organization 생성 + OrgMembership(OWNER) 생성
    const org = await db.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: { name, slug },
      })

      await tx.orgMembership.create({
        data: {
          userId,
          orgId: newOrg.id,
          role: 'OWNER',
        },
      })

      return newOrg
    })

    return NextResponse.json(
      {
        org: {
          id: org.id,
          name: org.name,
          slug: org.slug,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    return handleRouteError(err)
  }
}
