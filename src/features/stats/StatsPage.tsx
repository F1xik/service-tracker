import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
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
import { Spinner } from '@/components/ui/Spinner'

import { filterToRange, groupByRange, groupByService, type Range } from './aggregations'
import { useProfile } from '@/features/services/useServices'
import { useStats } from './useStats'

const DEFAULT_CURRENCY = 'PLN'

const RANGE_VALUES: Range[] = ['today', 'week', 'month', 'year']

const INCOME_COLOR = 'var(--color-primary)'
const INCOME_ACTIVE_COLOR = 'var(--color-primary-hover)'
const COUNT_COLOR = '#16a34a'
const COUNT_ACTIVE_COLOR = '#15803d'

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

export default function StatsPage() {
  const { t } = useTranslation()
  const statsQuery = useStats()
  const profileQuery = useProfile()
  const [range, setRange] = useState<Range>('month')

  const currency = profileQuery.data?.currency ?? DEFAULT_CURRENCY
  const entries = useMemo(() => statsQuery.data ?? [], [statsQuery.data])

  const filtered = useMemo(() => filterToRange(entries, range), [entries, range])
  const bucketData = useMemo(() => groupByRange(entries, range), [entries, range])
  const serviceData = useMemo(() => groupByService(filtered), [filtered])
  const serviceTotal = useMemo(
    () => serviceData.reduce((sum, s) => sum + s.total, 0),
    [serviceData],
  )

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
          <div
            role="group"
            aria-label={t('stats.range')}
            className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-1"
          >
            {RANGE_VALUES.map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                fullWidth
                variant={range === value ? 'primary' : 'ghost'}
                aria-pressed={range === value}
                onClick={() => setRange(value)}
              >
                {t(`stats.${value}`)}
              </Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <p className="text-center text-sm text-[var(--color-fg-muted)]">
                {t('stats.noIncomeInPeriod')}
              </p>
            </Card>
          ) : (
            <>
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
                          formatter={(value: number) => formatPrice(value, currency)}
                        />
                        <Bar
                          dataKey="total"
                          name={t('stats.earned')}
                          fill={INCOME_COLOR}
                          activeBar={{ fill: INCOME_ACTIVE_COLOR }}
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
                          formatter={(value: number) => String(value)}
                        />
                        <Bar
                          dataKey="count"
                          name={t('stats.customers')}
                          fill={COUNT_COLOR}
                          activeBar={{ fill: COUNT_ACTIVE_COLOR }}
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
                          formatter={(value: number) => formatPrice(value, currency)}
                        />
                        <Legend
                          formatter={(_value, _entry, index) => {
                            const slice = serviceData[index]
                            if (!slice) return ''
                            const pct =
                              serviceTotal > 0
                                ? Math.round((slice.total / serviceTotal) * 100)
                                : 0
                            return `${slice.name} · ${formatPrice(slice.total, currency)} · ${pct}%`
                          }}
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
                </Card>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}
