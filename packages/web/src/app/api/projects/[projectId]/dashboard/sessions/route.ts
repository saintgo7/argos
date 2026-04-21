import { NextRequest, NextResponse } from 'next/server'
import type { SessionItem } from '@argos/shared'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'
import { parseDateRange } from '@/lib/server/dashboard'
import { assertProjectAccessOrResponse } from '@/lib/server/dashboard-route-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/projects/:projectId/dashboard/sessions
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

    const sessions = await db.claudeSession.findMany({
      where: {
        projectId,
        startedAt: { gte: from, lte: to }
      },
      include: {
        user: { select: { id: true, name: true } },
        usageRecords: {
          select: { inputTokens: true, outputTokens: true, estimatedCostUsd: true }
        },
        _count: { select: { events: true } }
      },
      orderBy: { startedAt: 'desc' },
      take: 100
    })

    const sessionItems: SessionItem[] = sessions.map(s => {
      const totalInput = s.usageRecords.reduce((sum, r) => sum + r.inputTokens, 0)
      const totalOutput = s.usageRecords.reduce((sum, r) => sum + r.outputTokens, 0)
      const totalCost = s.usageRecords.reduce((sum, r) => sum + (r.estimatedCostUsd ?? 0), 0)

      return {
        id: s.id,
        userId: s.user.id,
        userName: s.user.name,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
        inputTokens: totalInput,
        outputTokens: totalOutput,
        estimatedCostUsd: totalCost,
        eventCount: s._count.events
      }
    })

    return NextResponse.json({ sessions: sessionItems })
  } catch (err) {
    return handleRouteError(err)
  }
}
