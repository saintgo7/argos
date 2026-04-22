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

const ROLES: OrgRole[] = ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER']

describe('canAccessIndividualData', () => {
  it('VIEWER만 false, 나머지는 true', () => {
    expect(canAccessIndividualData('OWNER')).toBe(true)
    expect(canAccessIndividualData('MANAGER')).toBe(true)
    expect(canAccessIndividualData('MEMBER')).toBe(true)
    expect(canAccessIndividualData('VIEWER')).toBe(false)
  })
})

describe('canManageOrg', () => {
  it('OWNER, MANAGER만 true', () => {
    expect(canManageOrg('OWNER')).toBe(true)
    expect(canManageOrg('MANAGER')).toBe(true)
    expect(canManageOrg('MEMBER')).toBe(false)
    expect(canManageOrg('VIEWER')).toBe(false)
  })
})

describe('canDeleteOrg', () => {
  it('OWNER만 true', () => {
    expect(canDeleteOrg('OWNER')).toBe(true)
    expect(canDeleteOrg('MANAGER')).toBe(false)
    expect(canDeleteOrg('MEMBER')).toBe(false)
    expect(canDeleteOrg('VIEWER')).toBe(false)
  })
})

describe('canAccessSession', () => {
  it('VIEWER는 본인 세션만', () => {
    expect(canAccessSession('VIEWER', 'u1', 'u1')).toBe(true)
    expect(canAccessSession('VIEWER', 'u1', 'u2')).toBe(false)
  })

  it('VIEWER가 아니면 항상 접근 가능', () => {
    for (const r of ['OWNER', 'MANAGER', 'MEMBER'] as OrgRole[]) {
      expect(canAccessSession(r, 'u1', 'u2')).toBe(true)
      expect(canAccessSession(r, 'u1', 'u1')).toBe(true)
    }
  })
})

describe('forbiddenByRole', () => {
  it('403 status with error body containing role and requirement', async () => {
    const res = forbiddenByRole('VIEWER', 'MEMBER 이상')
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('forbidden')
    expect(body.message).toContain('VIEWER')
    expect(body.message).toContain('MEMBER 이상')
  })
})

describe('stripPii', () => {
  it('top-level PII keys are removed', () => {
    const input = {
      userId: 'u1',
      userName: 'alice',
      email: 'a@b.com',
      sessionCount: 10,
      notPii: 'keep',
    }
    const out = stripPii(input)
    expect(out).toEqual({ sessionCount: 10, notPii: 'keep' })
  })

  it('nested PII keys are removed', () => {
    const input = {
      summary: { activeUserCount: 5, activeUserIds: ['u1', 'u2'] },
      total: 100,
    }
    const out = stripPii(input)
    expect(out).toEqual({ summary: { activeUserCount: 5 }, total: 100 })
  })

  it('arrays of objects strip PII from each element', () => {
    const input = [
      { userId: 'u1', count: 1 },
      { userId: 'u2', count: 2 },
    ]
    const out = stripPii(input)
    expect(out).toEqual([{ count: 1 }, { count: 2 }])
  })

  it('snake_case PII keys also removed', () => {
    const input = { user_id: 'u1', user_name: 'alice', active_user_ids: ['u1'], other: 1 }
    const out = stripPii(input)
    expect(out).toEqual({ other: 1 })
  })

  it('primitives pass through unchanged', () => {
    expect(stripPii(null)).toBe(null)
    expect(stripPii(undefined)).toBe(undefined)
    expect(stripPii(42)).toBe(42)
    expect(stripPii('hello')).toBe('hello')
    expect(stripPii(true)).toBe(true)
  })
})

describe('ROLES 완전성', () => {
  it('모든 역할이 canAccessIndividualData/canManageOrg의 입력으로 안전', () => {
    for (const r of ROLES) {
      expect(typeof canAccessIndividualData(r)).toBe('boolean')
      expect(typeof canManageOrg(r)).toBe('boolean')
      expect(typeof canDeleteOrg(r)).toBe('boolean')
    }
  })
})
