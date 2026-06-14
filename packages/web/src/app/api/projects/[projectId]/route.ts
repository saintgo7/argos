import { NextResponse } from 'next/server'
import { UpdateProjectSchema } from '@argos/shared'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'
import {
  assertProjectAccessOrResponse,
  assertOrgAccessOrResponse,
} from '@/lib/server/dashboard-route-helper'
import { canManageOrg, forbiddenByRole } from '@/lib/server/rbac'
import { db } from '@/lib/server/db'
import {
  getProjectForUser,
  updateProjectForUser,
} from '@/lib/server/project-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/projects/:projectId
export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { projectId } = await params

    const result = await getProjectForUser(projectId, userId)

    if (result.kind === 'not_found') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    if (result.kind === 'forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ project: result.project })
  } catch (err) {
    return handleRouteError(err)
  }
}

// PATCH /api/projects/:projectId
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { projectId } = await params

    // 프로젝트 이름 변경은 org 설정 변경이므로 Manager+ 권한 (프로젝트 생성과 동일 기준).
    const access = await assertProjectAccessOrResponse(projectId, userId)
    if (access instanceof NextResponse) return access
    const orgAccess = await assertOrgAccessOrResponse(access.orgId, userId)
    if (orgAccess instanceof NextResponse) return orgAccess
    if (!canManageOrg(orgAccess.role)) {
      return forbiddenByRole(orgAccess.role, 'MANAGER 이상')
    }

    const body = await req.json()
    const input = UpdateProjectSchema.parse(body)

    const result = await updateProjectForUser(projectId, userId, input)

    if (result.kind === 'not_found') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Project not found' } },
        { status: 404 }
      )
    }
    if (result.kind === 'forbidden') {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        { status: 403 }
      )
    }
    if (result.kind === 'name_conflict') {
      return NextResponse.json(
        {
          error: {
            code: 'PROJECT_NAME_CONFLICT',
            message: '이미 같은 이름의 프로젝트가 있습니다.',
          },
        },
        { status: 409 }
      )
    }

    return NextResponse.json({ project: result.project })
  } catch (err) {
    return handleRouteError(err)
  }
}

// DELETE /api/projects/:projectId
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth

    const { projectId } = await params

    const access = await assertProjectAccessOrResponse(projectId, userId)
    if (access instanceof NextResponse) return access

    // 프로젝트 삭제는 세션·이벤트·사용량을 모두 cascade 제거하므로 Manager+ 권한.
    const orgAccess = await assertOrgAccessOrResponse(access.orgId, userId)
    if (orgAccess instanceof NextResponse) return orgAccess
    if (!canManageOrg(orgAccess.role)) {
      return forbiddenByRole(orgAccess.role, 'MANAGER 이상')
    }

    await db.project.delete({ where: { id: projectId } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
