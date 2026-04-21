interface KpiCardProps {
  label: string
  value: string
}

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-6">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
