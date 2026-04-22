import { describe, it, expect } from 'vitest'
import type { OrgRole } from '@prisma/client'
import {
  canAccessIndividualData,
  canAccessSession,
  canDeleteOrg,
  canManageOrg,
  forbiddenByRole,
  stripPii,
} from './rbac'

describe('canAccessIndividualData', () => {
  it.each<[OrgRole, boolean]>([
    ['OWNER', true],
    ['MANAGER', true],
    ['MEMBER', true],
    ['VIEWER', false],
  ])('%s 역할 → %s (VIEWER만 개인 단위 데이터 접근 불가)', (role, expected) => {
    expect(canAccessIndividualData(role)).toBe(expected)
  })
})

describe('canManageOrg', () => {
  it.each<[OrgRole, boolean]>([
    ['OWNER', true],
    ['MANAGER', true],
    ['MEMBER', false],
    ['VIEWER', false],
  ])('%s 역할 → %s (OWNER·MANAGER만 관리 가능)', (role, expected) => {
    expect(canManageOrg(role)).toBe(expected)
  })
})

describe('canDeleteOrg', () => {
  it.each<[OrgRole, boolean]>([
    ['OWNER', true],
    ['MANAGER', false],
    ['MEMBER', false],
    ['VIEWER', false],
  ])('%s 역할 → %s (OWNER만 삭제 가능)', (role, expected) => {
    expect(canDeleteOrg(role)).toBe(expected)
  })
})

describe('canAccessSession', () => {
  it('VIEWER는 본인 세션에 접근 가능', () => {
    expect(canAccessSession('VIEWER', 'u1', 'u1')).toBe(true)
  })

  it('VIEWER는 타인 세션에 접근 불가', () => {
    expect(canAccessSession('VIEWER', 'u1', 'u2')).toBe(false)
  })

  it.each<OrgRole>(['OWNER', 'MANAGER', 'MEMBER'])(
    '%s 역할은 본인·타인 세션 모두 접근 가능',
    (role) => {
      expect(canAccessSession(role, 'u1', 'u1')).toBe(true)
      expect(canAccessSession(role, 'u1', 'u2')).toBe(true)
    }
  )
})

describe('forbiddenByRole', () => {
  it('403 status 를 반환한다', () => {
    const res = forbiddenByRole('VIEWER', 'MEMBER 이상')
    expect(res.status).toBe(403)
  })

  it('응답 body 의 error 필드는 항상 "forbidden"', async () => {
    const res = forbiddenByRole('MEMBER', 'MANAGER 이상')
    const body = await res.json()
    expect(body.error).toBe('forbidden')
  })

  it.each<OrgRole>(['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'])(
    '현재 역할(%s) 을 message 에 포함한다',
    async (role) => {
      const res = forbiddenByRole(role, 'MANAGER 이상')
      const body = await res.json()
      expect(body.message).toContain(role)
    }
  )

  it('필요 권한 설명을 message 에 포함한다', async () => {
    const res = forbiddenByRole('VIEWER', 'OWNER만')
    const body = await res.json()
    expect(body.message).toContain('OWNER만')
  })

  it('Content-Type 이 application/json (프론트가 JSON 으로 파싱 가능)', () => {
    const res = forbiddenByRole('VIEWER', 'MEMBER 이상')
    const ct = res.headers.get('content-type') ?? ''
    expect(ct).toContain('application/json')
  })
})

describe('stripPii', () => {
  it('최상위 PII 키(userId/userName/email)를 제거한다', () => {
    const input = {
      userId: 'u1',
      userName: 'alice',
      email: 'a@b.com',
      sessionCount: 10,
      notPii: 'keep',
    }
    expect(stripPii(input)).toEqual({ sessionCount: 10, notPii: 'keep' })
  })

  it('중첩된 객체 내부의 PII 키도 제거한다', () => {
    const input = {
      summary: { activeUserCount: 5, activeUserIds: ['u1', 'u2'] },
      total: 100,
    }
    expect(stripPii(input)).toEqual({
      summary: { activeUserCount: 5 },
      total: 100,
    })
  })

  it('객체 배열의 각 원소에서 PII 키를 제거한다', () => {
    const input = [
      { userId: 'u1', count: 1 },
      { userId: 'u2', count: 2 },
    ]
    expect(stripPii(input)).toEqual([{ count: 1 }, { count: 2 }])
  })

  it('snake_case PII 키(user_id/user_name/active_user_ids)도 제거한다', () => {
    const input = {
      user_id: 'u1',
      user_name: 'alice',
      active_user_ids: ['u1'],
      other: 1,
    }
    expect(stripPii(input)).toEqual({ other: 1 })
  })

  it('원시값(null·undefined·숫자·문자열·불리언)은 그대로 반환한다', () => {
    expect(stripPii(null)).toBe(null)
    expect(stripPii(undefined)).toBe(undefined)
    expect(stripPii(42)).toBe(42)
    expect(stripPii('hello')).toBe('hello')
    expect(stripPii(true)).toBe(true)
  })

  it('원본 객체를 변경하지 않는다 (immutability — 실수로 mutation 방지)', () => {
    const input = {
      userId: 'u1',
      nested: { email: 'a@b.com', count: 2 },
      arr: [{ userId: 'u2', ok: true }],
    }
    const snapshot = JSON.parse(JSON.stringify(input))
    stripPii(input)
    expect(input).toEqual(snapshot)
  })

  it('여러 번 호출해도 결과가 동일 (idempotency)', () => {
    const input = {
      userId: 'u1',
      nested: { userName: 'alice', count: 2 },
      arr: [{ user_id: 'u2', v: 1 }],
    }
    const once = stripPii(input)
    const twice = stripPii(stripPii(input))
    expect(twice).toEqual(once)
  })

  it('3단계 이상 깊은 중첩에서도 PII 키를 제거한다', () => {
    const input = {
      level1: {
        level2: {
          level3: { userId: 'u1', ok: true },
          peers: [{ email: 'a@b.com', v: 1 }],
        },
      },
    }
    expect(stripPii(input)).toEqual({
      level1: {
        level2: {
          level3: { ok: true },
          peers: [{ v: 1 }],
        },
      },
    })
  })

  it('모든 키가 PII 인 객체는 빈 객체를 반환한다', () => {
    expect(stripPii({ userId: 'u1', userName: 'a', email: 'e' })).toEqual({})
  })

  it('Prisma DailyProjectStat 응답 shape (userStats/activeUserIds 동시 포함) 에서 두 키 모두 제거', () => {
    // daily-rollup 에서 나올 수 있는 실제 구조. Defense-in-Depth 마지막 레이어.
    const input = {
      sessionCount: 100,
      activeUserCount: 5,
      activeUserIds: ['u1', 'u2', 'u3'],
      userStats: [
        { userId: 'u1', name: 'alice', sessionCount: 40 },
        { userId: 'u2', name: 'bob', sessionCount: 30 },
      ],
      topSkills: [{ skillName: 'x', callCount: 10 }],
    }
    expect(stripPii(input)).toEqual({
      sessionCount: 100,
      activeUserCount: 5,
      topSkills: [{ skillName: 'x', callCount: 10 }],
    })
  })
})
