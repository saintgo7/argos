import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  padded?: boolean
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  padded = true,
}: ChartCardProps) {
  const hasHeader = Boolean(title || description || action)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10',
        padded ? 'p-4' : '',
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex flex-col gap-0.5">
            {title && (
              <h3 className="text-sm font-medium text-foreground truncate">{title}</h3>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('min-w-0', contentClassName)}>{children}</div>
    </div>
  )
}
