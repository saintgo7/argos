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

    const [sessionCount, usageTotals, activeUsers, topSkills, topAgents] = await Promise.all([
      db.claudeSession.count({
        where: {
          projectId,
          startedAt: { gte: from, lte: to }
        }
      }),
      db.usageRecord.aggregate({
        where: {
          projectId,
          timestamp: { gte: from, lte: to }
        },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          cacheCreationTokens: true,
          cacheReadTokens: true,
          estimatedCostUsd: true
        }
      }),
      db.usageRecord.groupBy({
        by: ['userId'],
        where: {
          projectId,
          timestamp: { gte: from, lte: to }
        }
      }).then(r => r.length),
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
      })
    ])

    const summary: DashboardSummary = {
      sessionCount,
      activeUserCount: activeUsers,
      totalInputTokens: usageTotals._sum.inputTokens ?? 0,
      totalOutputTokens: usageTotals._sum.outputTokens ?? 0,
      totalCacheReadTokens: usageTotals._sum.cacheReadTokens ?? 0,
      totalCacheCreationTokens: usageTotals._sum.cacheCreationTokens ?? 0,
      estimatedCostUsd: usageTotals._sum.estimatedCostUsd ?? 0,
      topSkills: topSkills.map(s => ({
        skillName: s.skillName!,
        callCount: s._count.id
      })),
      topAgents: topAgents.map(a => ({
        agentType: a.agentType!,
        callCount: a._count.id
      }))
    }

    return NextResponse.json(summary)
  } catch (err) {
    return handleRouteError(err)
  }
}
