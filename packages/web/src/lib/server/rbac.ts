import { NextResponse } from 'next/server'
import type { OrgRole } from '@prisma/client'

/**
 * Level 1 RBAC 유틸.
 *
 * 역할 계층:
 *   OWNER    — org 전체 권한 (삭제 포함)
 *   MANAGER  — 멤버 관리 + 개인 단위 드릴다운 가능
 *   MEMBER   — 기본. 팀 세션·개인 드릴다운 열람 가능
 *   VIEWER   — 팀 단위 집계만. 개인 식별자·전사·세션 리스트 접근 불가
 *
 * 핵심 원칙: 권한 차단은 API/쿼리 레이어에서 **구조적으로** 강제. UI 숨김은 보조.
 */

/**
 * 개인 단위 데이터(세션 리스트·전사·사용자별 통계·전사 원문) 접근 가능 여부.
 * VIEWER만 false.
 */
export function canAccessIndividualData(role: OrgRole): boolean {
  return role !== 'VIEWER'
}

/**
 * org 관리(멤버 추가·역할 변경·프로젝트 생성·org 설정 변경) 가능 여부.
 * OWNER, MANAGER만 true.
 */
export function canManageOrg(role: OrgRole): boolean {
  return role === 'OWNER' || role === 'MANAGER'
}

/**
 * org 삭제 가능 여부. OWNER만.
 */
export function canDeleteOrg(role: OrgRole): boolean {
  return role === 'OWNER'
}

/**
 * 특정 세션 접근 가능 여부. Viewer는 본인 세션만 (self-hosting에서 임원이
 * Claude Code를 쓸 일이 드물지만, 자기 세션까지 막을 필요는 없음).
 */
export function canAccessSession(
  role: OrgRole,
  sessionUserId: string,
  currentUserId: string
): boolean {
  if (role !== 'VIEWER') return true
  return sessionUserId === currentUserId
}

/**
 * 역할 거부 시 403 응답을 생성. 라우트에서 early return에 사용.
 */
export function forbiddenByRole(role: OrgRole, need: string): NextResponse {
  return NextResponse.json(
    {
      error: 'forbidden',
      message: `현재 역할(${role})에서는 이 리소스에 접근할 수 없습니다. 필요: ${need}`,
    },
    { status: 403 }
  )
}

/**
 * 응답 객체에서 개인 식별자 키를 제거. Viewer 응답의 defense-in-depth 마지막 레이어.
 * 재귀적으로 모든 중첩 객체/배열을 순회하여 PII_KEYS를 삭제.
 *
 * 주의: mutation 없이 새 객체를 반환.
 */
const PII_KEYS = new Set([
  'userId',
  'user_id',
  'userName',
  'user_name',
  'userEmail',
  'user_email',
  'email',
  'activeUserIds',
  'active_user_ids',
  'userStats',
  'user_stats',
  'topUsers',
  'top_users',
])

export function stripPii<T>(value: T): T {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) {
    return value.map((v) => stripPii(v)) as unknown as T
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(k)) continue
      out[k] = stripPii(v)
    }
    return out as T
  }
  return value
}
