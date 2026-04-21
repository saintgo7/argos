import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChangeIndicator } from './change-indicator'

interface MetricCardProps {
  label: string
  value: string | number
  change?: number
  indicator?: ReactNode
  suffix?: ReactNode
  className?: string
}

export function MetricCard({
  label,
  value,
  change,
  indicator,
  suffix,
  className,
}: MetricCardProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 px-4 py-3.5', className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {indicator}
        <span className="metric-label">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="metric-value text-foreground">{value}</span>
        {suffix}
      </div>
      {change !== undefined && <ChangeIndicator value={change} />}
    </div>
  )
}

export function MetricBar({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10',
        'divide-x divide-border [&>*]:flex-1 [&>*]:min-w-[150px]',
        className,
      )}
    >
      {children}
    </div>
  )
}
