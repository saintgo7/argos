'use client'

import { Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { subDays, format, differenceInDays } from 'date-fns'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { ChartCard } from '@/components/dashboard/chart-card'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { RankedBarChart } from '@/components/dashboard/ranked-bar-chart'
import { useDashboardAgents } from '@/hooks/use-dashboard-agents'
import { formatDateTimeFull, formatLastUsed, formatDurationMs } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/info-tooltip'

function AgentsContent({
  orgSlug,
  projectId,
}: {
  orgSlug: string
  projectId: string | undefined
}) {
  const searchParams = useSearchParams()
  const today = new Date()
  const sevenDaysAgo = subDays(today, 7)

  const from = searchParams.get('from') || format(sevenDaysAgo, 'yyyy-MM-dd')
  const to = searchParams.get('to') || format(today, 'yyyy-MM-dd')

  const { data, isLoading, error, refetch } = useDashboardAgents(orgSlug, {
    projectId,
    from,
    to,
  })

  const rangeDays = differenceInDays(new Date(to), new Date(from)) + 1
  const rangeLabel = `last ${rangeDays} day${rangeDays === 1 ? '' : 's'}`

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-80" />
        </div>
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
          <Skeleton className="h-12 w-full" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Agents</h1>
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              재시도
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const agents = data?.agents ?? []
  const totalInvocations = agents.reduce((sum, a) => sum + a.callCount, 0)

  if (agents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-semibold">Agents</h1>
            <span className="text-sm text-muted-foreground">{rangeLabel}</span>
          </div>
          <DateRangePicker />
        </div>

        <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-12 text-center">
          <h2 className="text-lg font-medium mb-2">
            아직 Agent 호출이 없습니다
          </h2>
          <p className="text-sm text-muted-foreground">
            Claude Code에서 Agent를 사용하면 여기에 표시됩니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-semibold">Agents</h1>
          <span className="text-sm text-muted-foreground">{rangeLabel}</span>
        </div>
        <DateRangePicker />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard label="Unique agents used" value={agents.length.toLocaleString()} />
        <KpiCard label="Total invocations" value={totalInvocations.toLocaleString()} />
      </div>

      <ChartCard title="Top agents (by invocations)">
        <RankedBarChart
          data={agents.map(a => ({ label: a.agentType, value: a.callCount }))}
          valueLabel="Invocations"
        />
      </ChartCard>

      <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
        <div className="px-4 py-4 border-b border-border">
          <h2 className="text-sm font-medium">All agents</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4 font-medium whitespace-nowrap">Agent</th>
                <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Invocations</th>
                <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Sessions</th>
                <th className="text-right py-3 px-4 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Users
                    <InfoTooltip content="집계 기간 내 이 agent를 한 번이라도 호출한 distinct user_id 수 (events 테이블 기준, COUNT(DISTINCT user_id))." />
                  </span>
                </th>
                <th className="text-right py-3 px-4 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    Median duration
                    <InfoTooltip content="이 agent의 tool 완료 시간 중앙값 — messages.duration_ms 의 p50. durationMs는 세션 종료(Stop) 시 transcript 기반으로 재빌드되므로 진행 중인 세션은 포함되지 않는다. 샘플 < 3건일 땐 —(대시) 표시." />
                  </span>
                </th>
                <th className="text-left py-3 px-4 font-medium">Description</th>
                <th className="text-right py-3 px-4 font-medium whitespace-nowrap">Last used</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {agents.map((agent) => (
                <tr key={agent.agentType} className="border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors">
                  <td className="py-3 px-4">
                    <span className="inline-flex rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
                      {agent.agentType}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 tabular-nums">{agent.callCount.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 tabular-nums">{agent.sessionCount.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 tabular-nums">{agent.userCount.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 tabular-nums">
                    {agent.medianDurationMs != null ? formatDurationMs(agent.medianDurationMs) : '—'}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground max-w-md">
                    {agent.sampleDesc ? (
                      <span className="block truncate" title={agent.sampleDesc}>
                        {agent.sampleDesc}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                  <td
                    className="text-right py-3 px-4 tabular-nums text-muted-foreground whitespace-nowrap"
                    title={formatDateTimeFull(agent.lastUsedAt)}
                  >
                    {formatLastUsed(agent.lastUsedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function OrgAgentsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const orgSlug = params.orgSlug as string
  const projectId = searchParams.get('projectId') ?? undefined

  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <AgentsContent orgSlug={orgSlug} projectId={projectId} />
    </Suspense>
  )
}
