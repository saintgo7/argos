import { NextResponse } from 'next/server'
import { CreateProjectSchema } from '@argos/shared'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'
import {
  generateUniqueOrgSlug,
  generateUniqueProjectSlug,
} from '@/lib/server/slug'
import { getProjectsForUser } from '@/lib/server/project-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/projects
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const projects = await getProjectsForUser(userId)
    return NextResponse.json({ projects })
  } catch (err) {
    return handleRouteError(err)
  }
}

// POST /api/projects
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const body = await req.json()
    const { name, orgId: requestedOrgId } = CreateProjectSchema.parse(body)

    let orgId: string

    if (requestedOrgId) {
      // orgId가 제공된 경우: 해당 org 사용
      orgId = requestedOrgId
    } else {
      // orgId가 없는 경우: 현재 유저의 org 확인
      const memberships = await db.orgMembership.findMany({
        where: { userId },
      })

      if (memberships.length === 1) {
        // org가 1개면 그것 사용
        orgId = memberships[0].orgId
      } else {
        // org가 없으면 자동 생성
        const user = await db.user.findUnique({ where: { id: userId } })
        const orgName = user!.name
        const orgSlug = await generateUniqueOrgSlug(orgName)

        const newOrg = await db.$transaction(async (tx) => {
          const org = await tx.organization.create({
            data: { name: orgName, slug: orgSlug },
          })

          await tx.orgMembership.create({
            data: {
              userId,
              orgId: org.id,
              role: 'OWNER',
            },
          })

          return org
        })

        orgId = newOrg.id
      }
    }

    // slug 생성 (org 내에서 unique)
    const slug = await generateUniqueProjectSlug(name, orgId)

    // Project 생성
    const project = await db.project.create({
      data: {
        orgId,
        name,
        slug,
      },
      include: { organization: true },
    })

    return NextResponse.json(
      {
        projectId: project.id,
        orgId: project.orgId,
        orgName: project.organization.name,
        projectName: project.name,
        projectSlug: project.slug,
      },
      { status: 201 }
    )
  } catch (err) {
    return handleRouteError(err)
  }
}
