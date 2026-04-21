import 'server-only'

import { NextResponse } from 'next/server'
import { assertProjectAccess } from './dashboard'

/**
 * Dashboard 라우트용 공통 헬퍼.
 * assertProjectAccess를 호출하고, 실패 시 NextResponse를 반환한다.
 * 성공 시 { orgId } 반환.
 *
 * 사용 패턴:
 *   const access = await assertProjectAccessOrResponse(projectId, userId)
 *   if (access instanceof NextResponse) return access
 *   const { orgId } = access
 */
export async function assertProjectAccessOrResponse(
  projectId: string,
  userId: string
): Promise<{ orgId: string } | NextResponse> {
  try {
    return await assertProjectAccess(projectId, userId)
  } catch (err) {
    const message = (err as Error).message
    if (message === 'Project not found') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
