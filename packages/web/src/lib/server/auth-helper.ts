import 'server-only'

import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { db } from './db'
import { verifyJwt } from './jwt'

/**
 * 라우트 핸들러용 인증 헬퍼.
 * packages/api/src/middleware/auth.ts와 동일한 동작.
 *
 * 사용 패턴:
 *   const auth = await requireAuth(req)
 *   if (auth instanceof NextResponse) return auth
 *   const { userId } = auth
 */
export async function requireAuth(
  req: Request
): Promise<{ userId: string } | NextResponse> {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.substring(7)

  // 1. JWT 검증
  const payload = await verifyJwt(token)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. tokenHash 계산 (SHA-256)
  const tokenHash = createHash('sha256').update(token).digest('hex')

  // 3. DB에서 CliToken 조회
  let cliToken
  try {
    cliToken = await db.cliToken.findUnique({ where: { tokenHash } })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // 4. revocation 체크
  if (!cliToken || cliToken.revokedAt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 5. lastUsedAt 업데이트 (fire-and-forget)
  db.cliToken
    .update({
      where: { tokenHash },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // 에러 무시
    })

  // 6. userId 반환
  return { userId: payload.sub }
}
