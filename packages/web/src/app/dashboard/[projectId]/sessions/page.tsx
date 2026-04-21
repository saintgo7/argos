'use client'

import { use, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { subDays, format } from 'date-fns'
import { DateRangePicker } from '@/components/dashboard/date-range-picker'
import { useDashboardSessions } from '@/hooks/use-dashboard-sessions'
import { formatTokens, formatCost, formatDateTimeFull } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

function SessionsContent({ projectId }: { projectId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)

  const from = searchParams.get('from') || format(thirtyDaysAgo, 'yyyy-MM-dd')
  const to = searchParams.get('to') || format(today, 'yyyy-MM-dd')

  const { data, isLoading, error, refetch } = useDashboardSessions(projectId, from, to)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-96" />
        </div>
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
          <Skeleton className="h-12 w-full" />
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Sessions</h1>
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

  const handleRowClick = (sessionId: string) => {
    router.push(`/dashboard/${projectId}/sessions/${sessionId}`)
  }

  if (!data?.sessions || data.sessions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-semibold">Sessions</h1>
          <DateRangePicker />
        </div>

        <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-12 text-center">
          <h2 className="text-lg font-medium mb-2">
            이 기간에 세션이 없습니다
          </h2>
          <p className="text-sm text-muted-foreground">
            날짜 범위를 변경해보세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <DateRangePicker />
      </div>

      <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/40 border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">사용자</th>
              <th className="text-left py-3 px-4 font-medium">제목</th>
              <th className="text-right py-3 px-4 font-medium whitespace-nowrap">입력토큰</th>
              <th className="text-right py-3 px-4 font-medium whitespace-nowrap">출력토큰</th>
              <th className="text-right py-3 px-4 font-medium whitespace-nowrap">비용</th>
              <th className="text-left py-3 px-4 font-medium whitespace-nowrap">시간</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {data.sessions.map((session) => (
              <tr
                key={session.id}
                onClick={() => handleRowClick(session.id)}
                className="border-b border-border last:border-b-0 hover:bg-muted/40 cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 whitespace-nowrap">{session.userName}</td>
                <td className="py-3 px-4 max-w-md">
                  <div className="truncate">
                    {session.title ?? <span className="text-muted-foreground">—</span>}
                  </div>
                </td>
                <td className="text-right py-3 px-4 whitespace-nowrap tabular-nums">{formatTokens(session.inputTokens)}</td>
                <td className="text-right py-3 px-4 whitespace-nowrap tabular-nums">{formatTokens(session.outputTokens)}</td>
                <td className="text-right py-3 px-4 whitespace-nowrap tabular-nums">{formatCost(session.estimatedCostUsd)}</td>
                <td className="py-3 px-4 whitespace-nowrap tabular-nums text-muted-foreground">
                  {formatDateTimeFull(session.startedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SessionsPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)

  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <SessionsContent projectId={projectId} />
    </Suspense>
  )
}
