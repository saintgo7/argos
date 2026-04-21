'use client'

import { use, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { subDays, format } from 'date-fns'
import { MetricBar, MetricCard } from '@/components/dashboard/metric-card'
import { ChartCard } from '@/components/dashboard/chart-card'
import { StatList, StatListRow } from '@/components/dashboard/stat-list'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { TokenUsageChart } from '@/components/dashboard/token-usage-chart'
import { useDashboardSummary } from '@/hooks/use-dashboard-summary'
import { useDashboardUsage } from '@/hooks/use-dashboard-usage'
import { formatTokens, formatCost } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

function OverviewContent({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams()
  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)

  const from = searchParams.get('from') || format(thirtyDaysAgo, 'yyyy-MM-dd')
  const to = searchParams.get('to') || format(today, 'yyyy-MM-dd')

  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useDashboardSummary(projectId, from, to)
  const { data: usage, isLoading: usageLoading, error: usageError, refetch: refetchUsage } = useDashboardUsage(projectId, from, to)

  if (summaryLoading || usageLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-72" />
        </div>
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
        <Skeleton className="h-56" />
      </div>
    )
  }

  if (summaryError || usageError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between">
            <span>데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchSummary()
                refetchUsage()
              }}
            >
              재시도
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const hasNoData = !summary || (summary.sessionCount === 0 && summary.activeUserCount === 0)

  if (hasNoData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Overview</h1>
          <DateRangePicker />
        </div>

        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-12 text-center">
          <h2 className="text-lg font-medium mb-2">
            아직 수집된 데이터가 없습니다
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            팀원들이 argos를 설정하고 Claude Code를 사용하면 여기에 데이터가 표시됩니다.
          </p>
          <a
            href="https://github.com/your-org/argos#setup"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline inline-flex items-center gap-1 text-sm"
          >
            설정 방법 보기 →
          </a>
        </div>
      </div>
    )
  }

  const totalTokens = (summary?.totalInputTokens ?? 0) + (summary?.totalOutputTokens ?? 0)
  const topSkills = summary?.topSkills?.slice(0, 5) ?? []
  const maxSkillCalls = topSkills.reduce((m, s) => Math.max(m, s.callCount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <DateRangePicker />
      </div>

      <MetricBar>
        <MetricCard
          label="Total Sessions"
          value={(summary?.sessionCount ?? 0).toLocaleString()}
          indicator={<span className="h-2 w-2 rounded-sm bg-brand" />}
        />
        <MetricCard
          label="Active Users"
          value={(summary?.activeUserCount ?? 0).toLocaleString()}
          indicator={<span className="h-2 w-2 rounded-sm bg-brand-2" />}
        />
        <MetricCard
          label="Total Tokens"
          value={formatTokens(totalTokens)}
        />
        <MetricCard
          label="Estimated Cost"
          value={formatCost(summary?.estimatedCostUsd ?? 0)}
        />
      </MetricBar>

      <ChartCard
        title="Token Usage Over Time"
        description="Input / output 토큰 사용량 추이"
      >
        <TokenUsageChart data={usage?.series ?? []} />
      </ChartCard>

      <ChartCard title="Top Skills" description="가장 많이 호출된 스킬 5개">
        {topSkills.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No skill data yet
          </p>
        ) : (
          <StatList>
            {topSkills.map((skill) => (
              <StatListRow
                key={skill.skillName}
                label={skill.skillName}
                value={skill.callCount.toLocaleString()}
                percent={maxSkillCalls > 0 ? (skill.callCount / maxSkillCalls) * 100 : 0}
                tone="brand"
              />
            ))}
          </StatList>
        )}
      </ChartCard>
    </div>
  )
}

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)

  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <OverviewContent projectId={projectId} />
    </Suspense>
  )
}
