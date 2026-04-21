import { NextRequest, NextResponse } from 'next/server'
import type { PaginatedResult, UserStat } from '@argos/shared'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'
import { parseDateRange, parsePagination } from '@/lib/server/dashboard'
import { assertProjectAccessOrResponse } from '@/lib/server/dashboard-route-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/projects/:projectId/dashboard/users?page=&pageSize=&from=&to=
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await requireAuth(req)
    if (auth instanceof NextResponse) return auth
    const { userId } = auth
    const { projectId } = await params

    const access = await assertProjectAccessOrResponse(projectId, userId)
    if (access instanceof NextResponse) return access
    const { orgId } = access

    const fromQuery = req.nextUrl.searchParams.get('from') ?? undefined
    const toQuery = req.nextUrl.searchParams.get('to') ?? undefined
    const { from, to } = parseDateRange(fromQuery, toQuery)

    const { page, pageSize, skip, take } = parsePagination(
      req.nextUrl.searchParams.get('page'),
      req.nextUrl.searchParams.get('pageSize'),
    )

    const sortParam = req.nextUrl.searchParams.get('sort')
    const sortByTokens = sortParam === 'tokens'

    const [users, totalRow] = await Promise.all([
      sortByTokens
        ? db.$queryRaw<Array<{
            id: string
            name: string
            avatar_url: string | null
            session_count: bigint
            input_tokens: bigint | null
            output_tokens: bigint | null
            cost_usd: number | null
            skill_calls: bigint
            agent_calls: bigint
          }>>`
            SELECT
              u.id,
              u.name,
              u.avatar_url,
              COUNT(DISTINCT s.id) AS session_count,
              SUM(ur.input_tokens) AS input_tokens,
              SUM(ur.output_tokens) AS output_tokens,
              SUM(ur.estimated_cost_usd) AS cost_usd,
              COUNT(CASE WHEN e.is_skill_call THEN 1 END) AS skill_calls,
              COUNT(CASE WHEN e.is_agent_call THEN 1 END) AS agent_calls
            FROM users u
            JOIN org_memberships om ON om.user_id = u.id AND om.org_id = ${orgId}
            LEFT JOIN usage_records ur ON ur.user_id = u.id AND ur.project_id = ${projectId}
              AND ur.timestamp BETWEEN ${from} AND ${to}
            LEFT JOIN claude_sessions s ON s.user_id = u.id AND s.project_id = ${projectId}
              AND s.started_at BETWEEN ${from} AND ${to}
            LEFT JOIN events e ON e.user_id = u.id AND e.project_id = ${projectId}
              AND e.timestamp BETWEEN ${from} AND ${to}
            GROUP BY u.id, u.name, u.avatar_url
            ORDER BY COALESCE(SUM(ur.input_tokens), 0) + COALESCE(SUM(ur.output_tokens), 0) DESC NULLS LAST, u.name ASC
            LIMIT ${take} OFFSET ${skip}
          `
        : db.$queryRaw<Array<{
            id: string
            name: string
            avatar_url: string | null
            session_count: bigint
            input_tokens: bigint | null
            output_tokens: bigint | null
            cost_usd: number | null
            skill_calls: bigint
            agent_calls: bigint
          }>>`
            SELECT
              u.id,
              u.name,
              u.avatar_url,
              COUNT(DISTINCT s.id) AS session_count,
              SUM(ur.input_tokens) AS input_tokens,
              SUM(ur.output_tokens) AS output_tokens,
              SUM(ur.estimated_cost_usd) AS cost_usd,
              COUNT(CASE WHEN e.is_skill_call THEN 1 END) AS skill_calls,
              COUNT(CASE WHEN e.is_agent_call THEN 1 END) AS agent_calls
            FROM users u
            JOIN org_memberships om ON om.user_id = u.id AND om.org_id = ${orgId}
            LEFT JOIN usage_records ur ON ur.user_id = u.id AND ur.project_id = ${projectId}
              AND ur.timestamp BETWEEN ${from} AND ${to}
            LEFT JOIN claude_sessions s ON s.user_id = u.id AND s.project_id = ${projectId}
              AND s.started_at BETWEEN ${from} AND ${to}
            LEFT JOIN events e ON e.user_id = u.id AND e.project_id = ${projectId}
              AND e.timestamp BETWEEN ${from} AND ${to}
            GROUP BY u.id, u.name, u.avatar_url
            ORDER BY u.name ASC
            LIMIT ${take} OFFSET ${skip}
          `,
      db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM users u
        JOIN org_memberships om ON om.user_id = u.id AND om.org_id = ${orgId}
      `,
    ])

    const items: UserStat[] = users.map(u => ({
      userId: u.id,
      name: u.name,
      avatarUrl: u.avatar_url,
      sessionCount: Number(u.session_count),
      inputTokens: Number(u.input_tokens ?? 0),
      outputTokens: Number(u.output_tokens ?? 0),
      estimatedCostUsd: Number(u.cost_usd ?? 0),
      skillCalls: Number(u.skill_calls),
      agentCalls: Number(u.agent_calls)
    }))

    const total = Number(totalRow[0]?.count ?? 0)
    const body: PaginatedResult<UserStat> = { items, total, page, pageSize }
    return NextResponse.json(body)
  } catch (err) {
    return handleRouteError(err)
  }
}
