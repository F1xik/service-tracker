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

import { useProfile } from '@/features/services/useServices'
import { groupByPeriod, groupByService, summarize, type Period } from './aggregations'
import { useStats } from './useStats'

const DEFAULT_CURRENCY = 'PLN'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="text-center">
      <div className="text-sm text-[var(--color-fg-muted)]">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-[var(--color-fg)]">
        {value}
      </div>
    </Card>
  )
}

export default function StatsPage() {
  const statsQuery = useStats()
  const profileQuery = useProfile()
  const [period, setPeriod] = useState<Period>('month')

  const currency = profileQuery.data?.currency ?? DEFAULT_CURRENCY
  const entries = useMemo(() => statsQuery.data ?? [], [statsQuery.data])

  const summary = useMemo(() => summarize(entries), [entries])
  const periodData = useMemo(() => groupByPeriod(entries, period), [entries, period])
  const serviceData = useMemo(() => groupByService(entries), [entries])
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
          <section className="grid grid-cols-3 gap-3">
            <SummaryCard
              label="All-time"
              value={formatPrice(summary.allTime, currency)}
            />
            <SummaryCard
              label="This month"
              value={formatPrice(summary.thisMonth, currency)}
            />
            <SummaryCard
              label="Entries this month"
              value={String(summary.entriesThisMonth)}
            />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-fg)]">
                Income over time
              </h2>
              <div
                role="group"
                aria-label="Period"
                className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] p-1"
              >
                {PERIODS.map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={period === value ? 'primary' : 'ghost'}
                    aria-pressed={period === value}
                    onClick={() => setPeriod(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <Card>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodData}>
                    <XAxis dataKey="label" fontSize={12} tickLine={false} />
                    <YAxis fontSize={12} tickLine={false} width={48} />
                    <Tooltip
                      formatter={(value: number) => formatPrice(value, currency)}
                    />
                    <Bar
                      dataKey="total"
                      name="Earned"
                      fill="var(--color-primary)"
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
        </div>
      )}
    </div>
  )
}
