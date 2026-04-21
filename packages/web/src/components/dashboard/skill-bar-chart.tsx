'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts'
import type { SkillStat } from '@argos/shared'

interface SkillBarChartProps {
  data: SkillStat[]
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null

  const skillName = payload[0]?.payload?.skill
  const calls = payload[0]?.value ?? 0

  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3">
      <p className="font-medium mb-1" title={skillName}>{skillName}</p>
      <div className="text-sm">
        <span className="text-muted-foreground">Calls:</span>
        <span className="font-medium ml-2 tabular-nums">{calls.toLocaleString()}</span>
      </div>
    </div>
  )
}

function truncateSkillName(name: string, maxLength = 15) {
  if (name.length <= maxLength) return name
  return name.slice(0, maxLength) + '...'
}

export function SkillBarChart({ data }: SkillBarChartProps) {
  const chartData = data.slice(0, 10).map(s => ({
    skill: s.skillName,
    displaySkill: truncateSkillName(s.skillName),
    calls: s.callCount,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis
          type="number"
          stroke="var(--color-muted-foreground)"
          tickLine={false}
          axisLine={false}
          style={{ fontSize: '11px' }}
        />
        <YAxis
          dataKey="displaySkill"
          type="category"
          width={120}
          stroke="var(--color-muted-foreground)"
          tickLine={false}
          axisLine={false}
          style={{ fontSize: '11px' }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }} />
        <Bar dataKey="calls" name="Calls" radius={[0, 4, 4, 0]} fill="var(--color-chart-1)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
