import 'server-only'

import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { db } from './db'
import { verifyJwt } from './jwt'

// 토큰 검증 결과 in-memory 캐시. TTL 동안 revocation 반영이 지연될 수 있으나,
// 60초 단위이므로 CLI 토큰 무효화가 즉시 반영되어야 할 케이스에서만 주의.
const TOKEN_CACHE_TTL_MS = 60_000
const TOKEN_CACHE_MAX = 500
const LAST_USED_UPDATE_INTERVAL_MS = 60_000

type CacheEntry = { valid: boolean; expiresAt: number; lastWrittenAt: number }
const tokenCache = new Map<string, CacheEntry>()

function getCached(tokenHash: string, now: number): CacheEntry | null {
  const entry = tokenCache.get(tokenHash)
  if (!entry) return null
  if (entry.expiresAt <= now) {
    tokenCache.delete(tokenHash)
    return null
  }
  return entry
}

function setCached(tokenHash: string, valid: boolean, now: number, lastWrittenAt = 0) {
  if (tokenCache.size >= TOKEN_CACHE_MAX) {
    // 가장 오래된 엔트리 1개 제거 (Map은 insertion order 보장)
    const firstKey = tokenCache.keys().next().value
    if (firstKey !== undefined) tokenCache.delete(firstKey)
  }
  tokenCache.set(tokenHash, {
    valid,
    expiresAt: now + TOKEN_CACHE_TTL_MS,
    lastWrittenAt,
  })
}

export async function requireAuth(
  req: Request
): Promise<{ userId: string } | NextResponse> {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.substring(7)

  const payload = await verifyJwt(token)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const now = Date.now()

  const cached = getCached(tokenHash, now)
  if (cached) {
    if (!cached.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // lastUsedAt은 드물게만 업데이트 (캐시 hit 동안은 최대 1번/interval)
    if (now - cached.lastWrittenAt > LAST_USED_UPDATE_INTERVAL_MS) {
      cached.lastWrittenAt = now
      db.cliToken
        .update({ where: { tokenHash }, data: { lastUsedAt: new Date(now) } })
        .catch(() => {})
    }
    return { userId: payload.sub }
  }

  let cliToken
  try {
    cliToken = await db.cliToken.findUnique({ where: { tokenHash } })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (!cliToken || cliToken.revokedAt) {
    setCached(tokenHash, false, now)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  setCached(tokenHash, true, now, now)
  db.cliToken
    .update({ where: { tokenHash }, data: { lastUsedAt: new Date(now) } })
    .catch(() => {})

  return { userId: payload.sub }
}
