import { useTranslation } from 'react-i18next'

interface DeltaPillProps {
  /** Percent change vs the previous period, or `null` when there's no baseline. */
  value: number | null
}

/**
 * Small ▲/▼ badge showing a metric's percent change versus the previous
 * equivalent period (this month vs last month, this week vs last week, …).
 *
 * Renders nothing when there's no baseline (`value === null`, i.e. the previous
 * period had no income), so a brand-new period never shows a misleading pill.
 * Colour reflects direction only — up is positive/green, down is negative/red —
 * and the arrow plus an `aria-label` carry the meaning so it never relies on
 * colour alone.
 */
export function DeltaPill({ value }: DeltaPillProps) {
  const { t } = useTranslation()
  if (value === null) return null

  const rounded = Math.round(value)
  const magnitude = Math.abs(rounded)
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'

  const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '→'
  const tone =
    direction === 'up'
      ? 'bg-[var(--color-positive-subtle)] text-[var(--color-positive)]'
      : direction === 'down'
        ? 'bg-[var(--color-negative-subtle)] text-[var(--color-negative)]'
        : 'bg-[var(--color-surface-muted)] text-[var(--color-fg-muted)]'
  const label =
    direction === 'up'
      ? t('stats.increaseVsPrevious', { pct: magnitude })
      : direction === 'down'
        ? t('stats.decreaseVsPrevious', { pct: magnitude })
        : t('stats.noChangeVsPrevious')

  return (
    <span
      className={`mt-1.5 inline-flex w-fit items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${tone}`}
      aria-label={label}
      title={label}
    >
      <span aria-hidden>{arrow}</span>
      {magnitude}%
    </span>
  )
}
