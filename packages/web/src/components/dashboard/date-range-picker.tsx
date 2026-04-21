'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { subDays, format, differenceInDays } from 'date-fns'
import { Suspense } from 'react'
import { cn } from '@/lib/utils'

const PRESETS = [
  { days: 7, label: '7일' },
  { days: 30, label: '30일' },
  { days: 90, label: '90일' },
] as const

function DateRangePickerContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentFrom = searchParams.get('from')
  const currentTo = searchParams.get('to')

  const today = new Date()
  const thirtyDaysAgo = subDays(today, 30)

  const defaultFrom = currentFrom || format(thirtyDaysAgo, 'yyyy-MM-dd')
  const defaultTo = currentTo || format(today, 'yyyy-MM-dd')

  const fromDate = new Date(defaultFrom)
  const toDate = new Date(defaultTo)
  const daysDiff = differenceInDays(toDate, fromDate)

  const isToday = format(toDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  const activePreset = isToday
    ? daysDiff === 6
      ? 7
      : daysDiff === 29
        ? 30
        : daysDiff === 89
          ? 90
          : null
    : null

  const handlePreset = (days: number) => {
    const to = format(today, 'yyyy-MM-dd')
    const from = format(subDays(today, days), 'yyyy-MM-dd')

    const newParams = new URLSearchParams(searchParams.toString())
    newParams.set('from', from)
    newParams.set('to', to)

    router.push(`?${newParams.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="inline-flex rounded-lg bg-card ring-1 ring-border p-0.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => handlePreset(preset.days)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              activePreset === preset.days
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {format(fromDate, 'MMM d')} ~ {format(toDate, 'MMM d')}
      </span>
    </div>
  )
}

export function DateRangePicker() {
  return (
    <Suspense
      fallback={
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
      }
    >
      <DateRangePickerContent />
    </Suspense>
  )
}
