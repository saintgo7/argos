import { NextRequest, NextResponse } from 'next/server'
import type { DashboardSummary } from '@argos/shared'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'
import { parseDateRange } from '@/lib/server/dashboard'
import { assertProjectAccessOrResponse } from '@/lib/server/dashboard-route-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/projects/:projectId/dashboard/summary
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

    const fromQuery = req.nextUrl.searchParams.get('from') ?? undefined
    const toQuery = req.nextUrl.searchParams.get('to') ?? undefined
    const { from, to } = parseDateRange(fromQuery, toQuery)

    const [sessionCount, turnCount, usageTotals, topSkills, topAgents, modelRows] = await Promise.all([
      db.claudeSession.count({
        where: {
          projectId,
          startedAt: { gte: from, lte: to }
        }
      }),
      db.event.count({
        where: {
          projectId,
          eventType: 'STOP',
          timestamp: { gte: from, lte: to }
        }
      }),
      db.$queryRaw<Array<{
        inputTokens: bigint | null
        outputTokens: bigint | null
        cacheCreationTokens: bigint | null
        cacheReadTokens: bigint | null
        estimatedCostUsd: number | null
        activeUserCount: bigint
      }>>`
        SELECT
          SUM(input_tokens)::bigint                 AS "inputTokens",
          SUM(output_tokens)::bigint                AS "outputTokens",
          SUM(cache_creation_tokens)::bigint        AS "cacheCreationTokens",
          SUM(cache_read_tokens)::bigint            AS "cacheReadTokens",
          COALESCE(SUM(estimated_cost_usd), 0)      AS "estimatedCostUsd",
          COUNT(DISTINCT user_id)::bigint           AS "activeUserCount"
        FROM usage_records
        WHERE project_id = ${projectId}
          AND timestamp >= ${from}
          AND timestamp <= ${to}
      `,
      db.event.groupBy({
        by: ['skillName'],
        where: {
          projectId,
          isSkillCall: true,
          skillName: { not: null },
          timestamp: { gte: from, lte: to }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      db.event.groupBy({
        by: ['agentType'],
        where: {
          projectId,
          isAgentCall: true,
          agentType: { not: null },
          timestamp: { gte: from, lte: to }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      }),
      db.$queryRaw<Array<{
        model: string | null
        totalTokens: bigint | null
      }>>`
        SELECT
          model,
          SUM(input_tokens + output_tokens)::bigint AS "totalTokens"
        FROM usage_records
        WHERE project_id = ${projectId}
          AND timestamp >= ${from}
          AND timestamp <= ${to}
        GROUP BY model
        ORDER BY "totalTokens" DESC NULLS LAST
      `
    ])

    const totals = usageTotals[0]
    const summary: DashboardSummary = {
      sessionCount,
      turnCount,
      activeUserCount: Number(totals?.activeUserCount ?? 0),
      totalInputTokens: Number(totals?.inputTokens ?? 0),
      totalOutputTokens: Number(totals?.outputTokens ?? 0),
      totalCacheReadTokens: Number(totals?.cacheReadTokens ?? 0),
      totalCacheCreationTokens: Number(totals?.cacheCreationTokens ?? 0),
      estimatedCostUsd: Number(totals?.estimatedCostUsd ?? 0),
      topSkills: topSkills.map(s => ({
        skillName: s.skillName!,
        callCount: s._count.id
      })),
      topAgents: topAgents.map(a => ({
        agentType: a.agentType!,
        callCount: a._count.id
      })),
      modelShare: modelRows
        .filter(m => m.model && Number(m.totalTokens ?? 0) > 0)
        .map(m => ({
          model: m.model as string,
          totalTokens: Number(m.totalTokens ?? 0),
        }))
    }

    return NextResponse.json(summary)
  } catch (err) {
    return handleRouteError(err)
  }
}
