import { NextRequest, NextResponse } from 'next/server'
import type { UsageSeries } from '@argos/shared'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'
import { parseDateRange } from '@/lib/server/dashboard'
import { assertProjectAccessOrResponse } from '@/lib/server/dashboard-route-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/projects/:projectId/dashboard/usage
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

    const series = await db.$queryRaw<Array<{
      date: Date
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheCreationTokens: number
      estimatedCostUsd: number
    }>>`
      SELECT
        DATE_TRUNC('day', timestamp)::date AS date,
        SUM(input_tokens)::int             AS "inputTokens",
        SUM(output_tokens)::int            AS "outputTokens",
        SUM(cache_read_tokens)::int        AS "cacheReadTokens",
        SUM(cache_creation_tokens)::int    AS "cacheCreationTokens",
        COALESCE(SUM(estimated_cost_usd), 0) AS "estimatedCostUsd"
      FROM usage_records
      WHERE project_id = ${projectId}
        AND timestamp >= ${from}
        AND timestamp <= ${to}
      GROUP BY 1
      ORDER BY 1
    `

    const usageSeries: UsageSeries[] = series.map(s => ({
      date: s.date.toISOString().split('T')[0],
      inputTokens: s.inputTokens,
      outputTokens: s.outputTokens,
      cacheReadTokens: s.cacheReadTokens,
      cacheCreationTokens: s.cacheCreationTokens,
      estimatedCostUsd: Number(s.estimatedCostUsd)
    }))

    return NextResponse.json({ series: usageSeries })
  } catch (err) {
    return handleRouteError(err)
  }
}
