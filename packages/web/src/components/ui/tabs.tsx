'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type TabsContextValue = { value: string; onChange: (v: string) => void }
const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs.* must be used inside <Tabs>')
  return ctx
}

export function Tabs({
  value,
  onChange,
  children,
  className,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-4 border-b border-border', className)}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  const { value: active, onChange } = useTabs()
  const isActive = active === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onChange(value)}
      className={cn(
        'relative -mb-px px-1 py-2.5 text-sm font-medium transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm',
        isActive
          ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand after:rounded-full'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  const { value: active } = useTabs()
  if (active !== value) return null
  return <div className={className}>{children}</div>
}
