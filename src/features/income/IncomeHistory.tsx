import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { computeTakeHome } from '@/lib/calc'
import { formatPrice } from '@/lib/format'
import { shiftDays, todayLocal } from '@/lib/date'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'

import { DateRangePicker, type DateRange, type PresetId } from './DateRangePicker'
import { useDeleteAppointment, useInfiniteAppointments } from './useIncome'

function formatDate(value: string): string {
  // `value` is a date-only string (YYYY-MM-DD); parse as local, not UTC.
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface Filter {
  preset: PresetId
  range: DateRange
}

/** Default filter: the "Last 7 days" preset, inclusive of today. */
function defaultFilter(): Filter {
  const today = todayLocal()
  return { preset: 'last7', range: { from: shiftDays(today, -6), to: today } }
}

interface IncomeHistoryProps {
  currency: string
}

export function IncomeHistory({ currency }: IncomeHistoryProps) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<Filter>(defaultFilter)
  const historyQuery = useInfiniteAppointments(filter.range)
  const deleteAppointment = useDeleteAppointment()

  function handleDelete(id: string) {
    if (!window.confirm(t('income.deleteConfirm'))) return
    deleteAppointment.mutate(id)
  }

  const appointments = historyQuery.data?.pages.flatMap((page) => page.rows) ?? []
  const total = historyQuery.data?.pages[0]?.count ?? 0

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-[var(--color-fg)]">
        {t('income.history')}
      </h2>

      <div className="mb-4">
        <DateRangePicker
          value={filter.range}
          activePreset={filter.preset}
          onChange={(preset, range) => setFilter({ preset, range })}
        />
      </div>

      {historyQuery.isLoading ? (
        <div
          role="status"
          aria-label={t('income.loadingEntries')}
          className="flex justify-center py-10 text-[var(--color-fg-muted)]"
        >
          <Spinner />
        </div>
      ) : historyQuery.isError ? (
        <Alert variant="error">
          {historyQuery.error instanceof Error
            ? historyQuery.error.message
            : t('income.loadEntriesError')}
        </Alert>
      ) : appointments.length > 0 ? (
        <>
          <Card className="p-0">
            <ul className="divide-y divide-[var(--color-border)]">
              {appointments.map((appointment) => {
                const earned = appointment.entries.reduce(
                  (sum, e) => sum + e.amount_earned,
                  0,
                )
                const takeHome = computeTakeHome(earned, appointment.tip)
                return (
                  <li key={appointment.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 text-sm text-[var(--color-fg-muted)]">
                        {formatDate(appointment.provided_on)}
                        {appointment.customer ? ` · ${appointment.customer}` : ''}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="tabular-nums font-medium text-[var(--color-fg)]">
                          {formatPrice(takeHome, currency)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t('income.deleteEntry')}
                          onClick={() => handleDelete(appointment.id)}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {appointment.entries.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex justify-between gap-3 text-sm"
                        >
                          <span className="line-clamp-2 min-w-0 break-words text-[var(--color-fg)]">
                            {entry.service?.name ?? t('income.serviceFallback')}
                          </span>
                          <span className="shrink-0 tabular-nums text-[var(--color-fg-muted)]">
                            {formatPrice(entry.amount_earned, currency)}
                          </span>
                        </li>
                      ))}
                      {appointment.tip > 0 && (
                        <li className="flex justify-between gap-3 text-sm">
                          <span className="line-clamp-2 min-w-0 break-words text-[var(--color-fg)]">
                            {t('income.tip')}
                          </span>
                          <span className="shrink-0 tabular-nums text-[var(--color-fg-muted)]">
                            {formatPrice(appointment.tip, currency)}
                          </span>
                        </li>
                      )}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </Card>

          {historyQuery.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                loading={historyQuery.isFetchingNextPage}
                onClick={() => historyQuery.fetchNextPage()}
              >
                {t('income.loadMore')}
              </Button>
            </div>
          )}

          <p className="mt-3 text-center text-xs text-[var(--color-fg-muted)]">
            {t('income.showingCount', { shown: appointments.length, total })}
          </p>
        </>
      ) : (
        <Card>
          <p className="text-center text-sm text-[var(--color-fg-muted)]">
            {t('income.noEntriesInRange')}
          </p>
        </Card>
      )}
    </section>
  )
}
