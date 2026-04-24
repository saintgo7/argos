'use client'

import type { ReactNode } from 'react'
import { Tooltip } from '@base-ui/react/tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export function InfoTooltip({ content, className }: { content: ReactNode; className?: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-label="더 보기"
        className={cn('inline-flex cursor-default items-center', className)}
      >
        <Info size={12} className="text-muted-foreground/70" />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={4}>
          <Tooltip.Popup
            data-slot="info-tooltip-popup"
            className="rounded-md bg-popover text-popover-foreground ring-1 ring-foreground/10 shadow-md px-3 py-2 text-xs max-w-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          >
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}
