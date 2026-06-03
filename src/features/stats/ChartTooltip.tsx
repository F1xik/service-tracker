import type { TooltipProps } from 'recharts'

interface ChartTooltipProps extends TooltipProps<number, string> {
  /** Formats the numeric value for display (e.g. currency or plain count). */
  formatValue: (value: number) => string
  /**
   * Pie slices have no axis `label`, so derive the heading from the payload
   * name (the service / "Tips" slice) instead of the X category.
   */
  labelFromPayload?: boolean
  /** Optional swatch color, matched to the highlighted bar/slice. */
  color?: string
}

/**
 * Compact, theme-aware replacement for Recharts' default white tooltip. Reuses
 * the app's surface/border/foreground tokens so it adapts to light and dark
 * themes, and shows the X category (month/day/service) prominently above the
 * value.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  labelFromPayload,
  color,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0]
  const heading = labelFromPayload ? item.name : label
  const value = typeof item.value === 'number' ? item.value : Number(item.value)

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-[var(--shadow-md)]">
      {heading != null && (
        <p className="text-xs font-medium text-[var(--color-fg-muted)]">{heading}</p>
      )}
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-fg)] tabular-nums">
        {color && (
          <svg width={10} height={10} aria-hidden className="shrink-0">
            <rect width={10} height={10} rx={2} fill={color} />
          </svg>
        )}
        {formatValue(value)}
      </p>
    </div>
  )
}
