import { useState } from 'react'
import { StickyNote, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatPrice } from '@/lib/format'
import { shiftDays, todayLocal } from '@/lib/date'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'

import { DateRangePicker, type DateRange, type PresetId } from './DateRangePicker'
import { groupAppointmentsByDate } from './grouping'
import {
  useAppointmentDayCount,
  useDeleteAppointment,
  useInfiniteAppointments,
} from './useIncome'

function formatDate(value: string): string {
  // `value` is a date-only string (YYYY-MM-DD); parse as local, not UTC.
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  if (Number.isNaN(date.getTime())) return value
  // Include the short weekday; Intl places it up front (e.g. «пн, 1 июня 2026 г.»).
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
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
  // Notes are collapsed by default; this holds the ids of appointments whose
  // note the user has expanded inline.
  const [expandedNotes, setExpandedNotes] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const historyQuery = useInfiniteAppointments(filter.range)
  const dayCountQuery = useAppointmentDayCount(filter.range)
  const deleteAppointment = useDeleteAppointment()

  function handleDelete(id: string) {
    if (!window.confirm(t('income.deleteConfirm'))) return
    deleteAppointment.mutate(id)
  }

  function toggleNote(id: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const appointments = historyQuery.data?.pages.flatMap((page) => page.rows) ?? []
  // Pagination is by day, so the footer counts days (groups), not appointments.
  const groups = groupAppointmentsByDate(appointments)
  const totalDays = dayCountQuery.data ?? groups.length

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
              {groups.map((group) => (
                <li key={group.date}>
                  <div className="flex items-baseline justify-between gap-3 bg-[var(--color-surface-muted)] px-4 py-2">
                    <h3 className="text-sm font-semibold text-[var(--color-fg)]">
                      {formatDate(group.date)}
                    </h3>
                    <span
                      className="shrink-0 tabular-nums text-sm font-semibold text-[var(--color-fg)]"
                      aria-label={t('income.dayTotal', {
                        date: formatDate(group.date),
                      })}
                    >
                      {formatPrice(group.total, currency)}
                    </span>
                  </div>
                  <ul className="divide-y divide-[var(--color-border)]">
                    {group.appointments.map((appointment) => {
                      const note = appointment.note?.trim()
                      const noteExpanded = expandedNotes.has(appointment.id)
                      return (
                        <li key={appointment.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 break-words text-sm font-medium text-[var(--color-fg)]">
                              {appointment.customer ?? ''}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {note && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={
                                    noteExpanded
                                      ? t('income.hideNote')
                                      : t('income.showNote')
                                  }
                                  aria-expanded={noteExpanded}
                                  aria-controls={`note-${appointment.id}`}
                                  onClick={() => toggleNote(appointment.id)}
                                >
                                  <StickyNote size={18} aria-hidden="true" />
                                </Button>
                              )}
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
                          {note && noteExpanded && (
                            <p
                              id={`note-${appointment.id}`}
                              className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--color-fg-muted)]"
                            >
                              {note}
                            </p>
                          )}
                          <ul className="mt-1 space-y-0.5">
                            {appointment.entries.map((entry) => (
                              <li
                                key={entry.id}
                                className="flex justify-between gap-3 text-sm"
                              >
                                <span className="line-clamp-2 min-w-0 break-words text-[var(--color-fg-muted)]">
                                  {entry.service?.name ?? t('income.serviceFallback')}
                                </span>
                                <span className="shrink-0 tabular-nums text-[var(--color-fg-muted)]">
                                  {formatPrice(entry.amount_earned, currency)}
                                </span>
                              </li>
                            ))}
                            {appointment.tip > 0 && (
                              <li className="flex justify-between gap-3 text-sm">
                                <span className="line-clamp-2 min-w-0 break-words text-[var(--color-fg-muted)]">
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
                </li>
              ))}
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
            {t('income.showingCount', { shown: groups.length, total: totalDays })}
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
