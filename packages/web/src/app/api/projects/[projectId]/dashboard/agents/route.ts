import { NextRequest, NextResponse } from 'next/server'
import type { AgentStat } from '@argos/shared'
import { db } from '@/lib/server/db'
import { requireAuth } from '@/lib/server/auth-helper'
import { handleRouteError } from '@/lib/server/error-helper'
import { parseDateRange } from '@/lib/server/dashboard'
import { assertProjectAccessOrResponse } from '@/lib/server/dashboard-route-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/projects/:projectId/dashboard/agents
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

    const agents = await db.$queryRaw<Array<{
      agent_type: string
      call_count: bigint
      sample_desc: string | null
    }>>`
      WITH agent_counts AS (
        SELECT
          agent_type,
          COUNT(*) AS call_count
        FROM events
        WHERE project_id = ${projectId}
          AND is_agent_call = true
          AND agent_type IS NOT NULL
          AND timestamp >= ${from}
          AND timestamp <= ${to}
        GROUP BY agent_type
      ),
      agent_samples AS (
        SELECT DISTINCT ON (agent_type)
          agent_type,
          agent_desc
        FROM events
        WHERE project_id = ${projectId}
          AND is_agent_call = true
          AND agent_type IS NOT NULL
          AND timestamp >= ${from}
          AND timestamp <= ${to}
        ORDER BY agent_type, timestamp DESC
      )
      SELECT
        ac.agent_type,
        ac.call_count,
        ags.agent_desc AS sample_desc
      FROM agent_counts ac
      LEFT JOIN agent_samples ags ON ags.agent_type = ac.agent_type
      ORDER BY ac.call_count DESC
      LIMIT 50
    `

    const agentStats: AgentStat[] = agents.map(a => ({
      agentType: a.agent_type,
      callCount: Number(a.call_count),
      sampleDesc: a.sample_desc
    }))

    return NextResponse.json({ agents: agentStats })
  } catch (err) {
    return handleRouteError(err)
  }
}
