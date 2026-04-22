'use client'

import { formatTokens, formatCost } from '@/lib/format'
import type { UserStat } from '@argos/shared'

interface TopUsersListProps {
  users: UserStat[]
}

export function TopUsersList({ users }: TopUsersListProps) {
  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        최근 7일간 활동한 사용자가 없습니다
      </p>
    )
  }

  const maxTokens = users.reduce(
    (m, u) => Math.max(m, u.inputTokens + u.outputTokens),
    0,
  )

  return (
    <ol className="space-y-2">
      {users.map((u, i) => {
        const total = u.inputTokens + u.outputTokens
        const pct = maxTokens > 0 ? (total / maxTokens) * 100 : 0
        return (
          <li key={u.userId}>
            <div className="px-2 py-2">
              <div className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{u.name}</span>
                    <span className="text-xs tabular-nums text-foreground">
                      {formatTokens(total)}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-brand"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
                    <span>{u.sessionCount} sessions</span>
                    <span>·</span>
                    <span>{formatCost(u.estimatedCostUsd)}</span>
                  </div>
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
