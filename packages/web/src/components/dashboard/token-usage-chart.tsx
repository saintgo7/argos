'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts'
import { formatTokens, formatCost } from '@/lib/format'
import type { UsageSeries } from '@argos/shared'
import { format } from 'date-fns'

interface TokenUsageChartProps {
  data: UsageSeries[]
}

const COST_PER_INPUT_TOKEN = 0.000003 // $3 per million
const COST_PER_OUTPUT_TOKEN = 0.000015 // $15 per million

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null

  const inputTokens = payload[0]?.value ?? 0
  const outputTokens = payload[1]?.value ?? 0
  const estimatedCost = (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN)

  return (
    <div className="rounded-lg border border-border bg-popover text-popover-foreground shadow-lg p-3">
      <p className="font-medium mb-2">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-1" />
          <span className="text-muted-foreground">Input:</span>
          <span className="font-medium tabular-nums">{formatTokens(inputTokens)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-2" />
          <span className="text-muted-foreground">Output:</span>
          <span className="font-medium tabular-nums">{formatTokens(outputTokens)}</span>
        </div>
        <div className="pt-1 mt-1 border-t border-border">
          <span className="text-muted-foreground">Cost:</span>
          <span className="font-medium ml-2 tabular-nums">{formatCost(estimatedCost)}</span>
        </div>
      </div>
    </div>
  )
}

export function TokenUsageChart({ data }: TokenUsageChartProps) {
  const chartData = data.map(d => {
    const date = new Date(d.date)
    return {
      date: format(date, 'MMM d'),
      fullDate: format(date, 'MMM d, yyyy'),
      input: d.inputTokens,
      output: d.outputTokens,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="tokenInputFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="tokenOutputFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          stroke="var(--color-muted-foreground)"
          tickLine={false}
          axisLine={false}
          style={{ fontSize: '11px' }}
        />
        <YAxis
          tickFormatter={formatTokens}
          stroke="var(--color-muted-foreground)"
          tickLine={false}
          axisLine={false}
          style={{ fontSize: '11px' }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="input"
          stackId="1"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          fill="url(#tokenInputFill)"
          name="Input Tokens"
        />
        <Area
          type="monotone"
          dataKey="output"
          stackId="1"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          fill="url(#tokenOutputFill)"
          name="Output Tokens"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
