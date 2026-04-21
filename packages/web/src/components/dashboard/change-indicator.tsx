import { cn } from '@/lib/utils'

interface ChangeIndicatorProps {
  value: number
  className?: string
  digits?: number
}

export function ChangeIndicator({ value, className, digits = 1 }: ChangeIndicatorProps) {
  if (!Number.isFinite(value) || value === 0) {
    return (
      <span className={cn('metric-change text-muted-foreground', className)}>
        0.0%
      </span>
    )
  }

  const isUp = value > 0
  return (
    <span
      className={cn(
        'metric-change',
        isUp ? 'metric-change-up' : 'metric-change-down',
        className,
      )}
    >
      {isUp ? '+' : ''}{value.toFixed(digits)}%
      <span aria-hidden className="ml-0.5">{isUp ? '↑' : '↓'}</span>
    </span>
  )
}
