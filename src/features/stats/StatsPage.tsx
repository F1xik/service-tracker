import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatPrice } from '@/lib/format'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

import { ChartTooltip } from './ChartTooltip'
import {
  customWindow,
  filterToRange,
  filterToWindow,
  groupByRange,
  groupByService,
  groupByWindow,
  sumEarned,
  sumTips,
  TIPS_SLICE_NAME,
  type Range,
  type ServiceTotal,
} from './aggregations'
import { useProfile } from '@/features/services/useServices'
import { useStats } from './useStats'

const DEFAULT_CURRENCY = 'PLN'

/** The four fixed presets plus the date-range-driven "all time" and "period". */
type StatsPreset = Range | 'all' | 'custom'

const PRESETS: StatsPreset[] = ['today', 'week', 'month', 'year', 'all', 'custom']

// Translation key under `stats.*` for each preset's toggle label.
const PRESET_LABEL_KEY: Record<StatsPreset, string> = {
  today: 'today',
  week: 'week',
  month: 'month',
  year: 'year',
  all: 'allTime',
  custom: 'period',
}

const INCOME_COLOR = 'var(--color-primary)'
const COUNT_COLOR = '#16a34a'
// Amber highlight, distinct in hue from both bar fills (blue income, green
// customers), so the hovered/selected bar clearly stands out in either theme.
const BAR_ACTIVE_COLOR = '#f59e0b'

// Distinct, color-blind-friendly palette cycled across pie slices.
const PIE_COLORS = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#db2777',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
  '#65a30d',
]

// Build a legend row label: "name · price · pct%". Tips get a translated name.
function serviceLabel(
  slice: ServiceTotal,
  serviceTotal: number,
  currency: string,
  t: (key: string) => string,
): string {
  const name = slice.name === TIPS_SLICE_NAME ? t('stats.tips') : slice.name
  const pct = serviceTotal > 0 ? Math.round((slice.total / serviceTotal) * 100) : 0
  return `${name} · ${formatPrice(slice.total, currency)} · ${pct}%`
}

export default function StatsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const statsQuery = useStats()
  const profileQuery = useProfile()
  const [preset, setPreset] = useState<StatsPreset>('month')
  const [customRange, setCustomRange] = useState({ from: '', to: '' })

  const currency = profileQuery.data?.currency ?? DEFAULT_CURRENCY
  const entries = useMemo(() => statsQuery.data ?? [], [statsQuery.data])

  // The fixed presets keep their original windowed path; "all time" and "period"
  // resolve to a date-range window with auto-chosen bucketing.
  const isWindow = preset === 'all' || preset === 'custom'
  const window = useMemo(
    () =>
      customWindow(
        entries,
        preset === 'all' ? '' : customRange.from,
        preset === 'all' ? '' : customRange.to,
      ),
    [entries, preset, customRange],
  )

  const filtered = useMemo(
    () => (isWindow ? filterToWindow(entries, window) : filterToRange(entries, preset)),
    [entries, isWindow, window, preset],
  )
  const bucketData = useMemo(
    () =>
      isWindow
        ? groupByWindow(entries, window, locale)
        : groupByRange(entries, preset, undefined, locale),
    [entries, isWindow, window, preset, locale],
  )
  const serviceData = useMemo(() => groupByService(filtered), [filtered])
  const serviceTotal = useMemo(
    () => serviceData.reduce((sum, s) => sum + s.total, 0),
    [serviceData],
  )

  // Headline totals for the selected filter, derived from the bars so the
  // numbers always match the charts below.
  const incomeTotal = useMemo(
    () => bucketData.reduce((sum, b) => sum + b.total, 0),
    [bucketData],
  )
  const customerCount = useMemo(
    () => bucketData.reduce((sum, b) => sum + b.count, 0),
    [bucketData],
  )
  // Split the take-home total into its service-earnings and tips parts. Derived
  // from the same `filtered` set, so incomeExclTips + tipsTotal === incomeTotal.
  const incomeExclTips = useMemo(() => sumEarned(filtered), [filtered])
  const tipsTotal = useMemo(() => sumTips(filtered), [filtered])

  // Clamp the custom window so `from` never exceeds `to` (collapse to one day).
  const setCustomFrom = (from: string) =>
    setCustomRange((r) => ({ from, to: r.to && from > r.to ? from : r.to }))
  const setCustomTo = (to: string) =>
    setCustomRange((r) => ({ from: to && r.from > to ? to : r.from, to }))

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-fg)]">
          {t('stats.title')}
        </h1>
      </header>

      {statsQuery.isLoading ? (
        <div
          role="status"
          aria-label={t('stats.loadingStats')}
          className="flex justify-center py-10 text-[var(--color-fg-muted)]"
        >
          <Spinner />
        </div>
      ) : statsQuery.isError ? (
        <Alert variant="error">
          {statsQuery.error instanceof Error
            ? statsQuery.error.message
            : t('stats.loadStatsError')}
        </Alert>
      ) : entries.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-[var(--color-fg-muted)]">
            {t('stats.noIncome')}
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="space-y-3">
            <div
              role="group"
              aria-label={t('stats.range')}
              className="grid grid-cols-3 gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-1"
            >
              {PRESETS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={preset === value ? 'primary' : 'ghost'}
                  aria-pressed={preset === value}
                  onClick={() => setPreset(value)}
                  className="whitespace-nowrap"
                >
                  {t(`stats.${PRESET_LABEL_KEY[value]}`)}
                </Button>
              ))}
            </div>

            {preset === 'custom' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="stats-from" label={t('stats.from')}>
                  <Input
                    id="stats-from"
                    type="date"
                    className="min-w-0 appearance-none"
                    value={customRange.from}
                    max={customRange.to || undefined}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                </Field>
                <Field id="stats-to" label={t('stats.to')}>
                  <Input
                    id="stats-to"
                    type="date"
                    className="min-w-0 appearance-none"
                    value={customRange.to}
                    min={customRange.from || undefined}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <p className="text-center text-sm text-[var(--color-fg-muted)]">
                {t('stats.noIncomeInPeriod')}
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card className="min-w-0">
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    {t('stats.totalEarned')}
                  </p>
                  <p className="mt-1 break-words text-xl font-bold leading-tight text-[var(--color-fg)] tabular-nums">
                    {formatPrice(incomeTotal, currency)}
                  </p>
                </Card>
                <Card className="min-w-0">
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    {t('stats.totalCustomers')}
                  </p>
                  <p className="mt-1 break-words text-xl font-bold leading-tight text-[var(--color-fg)] tabular-nums">
                    {customerCount}
                  </p>
                </Card>
                <Card className="min-w-0">
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    {t('stats.totalIncomeExclTips')}
                  </p>
                  <p className="mt-1 break-words text-xl font-bold leading-tight text-[var(--color-fg)] tabular-nums">
                    {formatPrice(incomeExclTips, currency)}
                  </p>
                </Card>
                <Card className="min-w-0">
                  <p className="text-sm text-[var(--color-fg-muted)]">
                    {t('stats.totalTips')}
                  </p>
                  <p className="mt-1 break-words text-xl font-bold leading-tight text-[var(--color-fg)] tabular-nums">
                    {formatPrice(tipsTotal, currency)}
                  </p>
                </Card>
              </div>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-[var(--color-fg)]">
                  {t('stats.income')}
                </h2>
                <Card>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bucketData}>
                        <XAxis dataKey="label" fontSize={12} tickLine={false} />
                        <YAxis fontSize={12} tickLine={false} width={48} />
                        <Tooltip
                          cursor={false}
                          content={
                            <ChartTooltip
                              formatValue={(value) => formatPrice(value, currency)}
                              color={BAR_ACTIVE_COLOR}
                            />
                          }
                        />
                        <Bar
                          dataKey="total"
                          name={t('stats.earned')}
                          fill={INCOME_COLOR}
                          activeBar={{ fill: BAR_ACTIVE_COLOR }}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-[var(--color-fg)]">
                  {t('stats.customers')}
                </h2>
                <Card>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bucketData}>
                        <XAxis dataKey="label" fontSize={12} tickLine={false} />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          width={48}
                          allowDecimals={false}
                        />
                        <Tooltip
                          cursor={false}
                          content={
                            <ChartTooltip
                              formatValue={(value) => String(value)}
                              color={BAR_ACTIVE_COLOR}
                            />
                          }
                        />
                        <Bar
                          dataKey="count"
                          name={t('stats.customers')}
                          fill={COUNT_COLOR}
                          activeBar={{ fill: BAR_ACTIVE_COLOR }}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </section>

              <section>
                <h2 className="mb-3 text-lg font-semibold text-[var(--color-fg)]">
                  {t('stats.incomeByService')}
                </h2>
                <Card>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          content={
                            <ChartTooltip
                              labelFromPayload
                              formatValue={(value) => formatPrice(value, currency)}
                            />
                          }
                        />
                        <Pie
                          data={serviceData}
                          dataKey="total"
                          nameKey="name"
                          outerRadius={80}
                        >
                          {serviceData.map((slice, index) => (
                            <Cell
                              key={slice.name}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend below the chart so it can never overlap the pie,
                      and the card grows to fit any number of services. */}
                  <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                    {serviceData.map((slice, index) => (
                      <li
                        key={slice.name}
                        className="flex items-center gap-2 text-sm text-[var(--color-fg)]"
                      >
                        <svg width={12} height={12} aria-hidden className="shrink-0">
                          <rect
                            width={12}
                            height={12}
                            rx={2}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        </svg>
                        <span className="truncate">
                          {serviceLabel(slice, serviceTotal, currency, t)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}
