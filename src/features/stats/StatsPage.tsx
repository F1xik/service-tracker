import { useMemo, useState } from 'react'
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

const RANGES: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

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
          Stats
        </h1>
      </header>

      {statsQuery.isLoading ? (
        <div
          role="status"
          aria-label="Loading stats"
          className="flex justify-center py-10 text-[var(--color-fg-muted)]"
        >
          <Spinner />
        </div>
      ) : statsQuery.isError ? (
        <Alert variant="error">
          {statsQuery.error instanceof Error
            ? statsQuery.error.message
            : 'Could not load stats.'}
        </Alert>
      ) : entries.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-[var(--color-fg-muted)]">
            No income logged yet. Add an entry to see your stats here.
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          <div
            role="group"
            aria-label="Range"
            className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-1"
          >
            {RANGES.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                fullWidth
                variant={range === value ? 'primary' : 'ghost'}
                aria-pressed={range === value}
                onClick={() => setRange(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <p className="text-center text-sm text-[var(--color-fg-muted)]">
                No income in this period. Pick another range above.
              </p>
            </Card>
          ) : (
            <>
              <section>
                <h2 className="mb-3 text-lg font-semibold text-[var(--color-fg)]">
                  Income
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
                          name="Earned"
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
                  Customers
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
                          name="Customers"
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
                  Income by service
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
