import { useState } from 'react'
import { Pencil, StickyNote, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Service } from '@/lib/calc'
import { formatPrice } from '@/lib/format'
import { shiftDays, todayLocal } from '@/lib/date'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { Dialog } from '@/components/ui/Dialog'

import { DateRangePicker, type DateRange, type PresetId } from './DateRangePicker'
import { EntryForm, type EntryFormValues } from './EntryForm'
import { groupAppointmentsByDate } from './grouping'
import type { AppointmentWithEntries } from './api'
import {
  useAppointmentDayCount,
  useDeleteAppointment,
  useInfiniteAppointments,
  useUpdateAppointment,
} from './useIncome'

function formatDate(value: string, locale: string): string {
  // `value` is a date-only string (YYYY-MM-DD); parse as local, not UTC.
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  if (Number.isNaN(date.getTime())) return value
  // Format in the active app language (not the OS locale) so the heading matches
  // the chosen UI language. Include the short weekday; Intl places it up front
  // (e.g. «пн, 1 июня 2026 г.»).
  return date.toLocaleDateString(locale, {
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
  activeServices?: Service[]
  /** Default commission % (from the profile) for editing legacy lines. */
  commissionPct?: number
}

/**
 * Build the service list shown in the edit form's pickers. The form lists only
 * active services, but an appointment may reference one since deactivated or
 * deleted — without it the original selection would be lost. Union the active
 * list with a minimal `Service` reconstructed from each line so every existing
 * line stays selectable and submittable.
 */
function editServiceOptions(
  appointment: AppointmentWithEntries,
  activeServices: Service[],
): Service[] {
  const byId = new Map(activeServices.map((s) => [s.id, s]))
  for (const entry of appointment.entries) {
    if (!entry.service_id || byId.has(entry.service_id)) continue
    byId.set(entry.service_id, {
      id: entry.service_id,
      user_id: appointment.user_id,
      name: entry.service?.name ?? '',
      price: entry.price_snapshot,
      active: false,
      created_at: entry.created_at,
    })
  }
  return [...byId.values()]
}

function toInitialValues(appointment: AppointmentWithEntries): EntryFormValues {
  return {
    provided_on: appointment.provided_on,
    customer: appointment.customer ?? '',
    note: appointment.note ?? '',
    // A stored tip of 0 starts the field empty (showing the 0.00 placeholder)
    // rather than a literal 0 the user must delete; it round-trips back to 0.
    tip: appointment.tip || (undefined as unknown as number),
    commission: appointment.entries[0]?.commission_pct_snapshot ?? 0,
    lines: appointment.entries.map((entry) => ({
      service_id: entry.service_id ?? '',
      price: entry.price_snapshot,
    })),
  }
}

export function IncomeHistory({
  currency,
  activeServices = [],
  commissionPct = 0,
}: IncomeHistoryProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const [filter, setFilter] = useState<Filter>(defaultFilter)
  // Notes are collapsed by default; this holds the ids of appointments whose
  // note the user has expanded inline.
  const [expandedNotes, setExpandedNotes] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const [editing, setEditing] = useState<AppointmentWithEntries | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const historyQuery = useInfiniteAppointments(filter.range)
  const dayCountQuery = useAppointmentDayCount(filter.range)
  const deleteAppointment = useDeleteAppointment()
  const updateAppointment = useUpdateAppointment()

  function handleDelete(id: string) {
    if (!window.confirm(t('income.deleteConfirm'))) return
    deleteAppointment.mutate(id)
  }

  function closeEdit() {
    setEditing(null)
    setEditError(null)
  }

  async function handleEditSubmit(values: EntryFormValues) {
    if (!editing) return
    setEditError(null)
    try {
      await updateAppointment.mutateAsync({
        id: editing.id,
        provided_on: values.provided_on,
        customer: values.customer.trim() || null,
        note: values.note.trim() || null,
        tip: Number(values.tip) || 0,
        commissionPct: Number(values.commission) || 0,
        lines: values.lines.map((line) => ({
          service_id: line.service_id,
          price: Number(line.price),
        })),
      })
      closeEdit()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t('income.updateError'))
    }
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
                      {formatDate(group.date, locale)}
                    </h3>
                    <span
                      className="shrink-0 tabular-nums text-sm font-semibold text-[var(--color-fg)]"
                      aria-label={t('income.dayTotal', {
                        date: formatDate(group.date, locale),
                      })}
                    >
                      {formatPrice(group.total, currency, locale)}
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
                                aria-label={t('income.editEntry')}
                                onClick={() => {
                                  setEditError(null)
                                  setEditing(appointment)
                                }}
                              >
                                <Pencil size={18} aria-hidden="true" />
                              </Button>
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
                            <div
                              id={`note-${appointment.id}`}
                              className="mt-2 flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-3 py-2"
                            >
                              <StickyNote
                                size={14}
                                aria-hidden="true"
                                className="mt-0.5 shrink-0 text-[var(--color-fg-subtle)]"
                              />
                              <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-[var(--color-fg-muted)]">
                                {note}
                              </p>
                            </div>
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
                                  {formatPrice(entry.amount_earned, currency, locale)}
                                </span>
                              </li>
                            ))}
                            {appointment.tip > 0 && (
                              <li className="flex justify-between gap-3 text-sm">
                                <span className="line-clamp-2 min-w-0 break-words text-[var(--color-fg-muted)]">
                                  {t('income.tip')}
                                </span>
                                <span className="shrink-0 tabular-nums text-[var(--color-fg-muted)]">
                                  {formatPrice(appointment.tip, currency, locale)}
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

      <Dialog open={!!editing} onClose={closeEdit} title={t('income.editTitle')}>
        {editing && (
          <EntryForm
            activeServices={editServiceOptions(editing, activeServices)}
            commissionPct={commissionPct}
            currency={currency}
            initialValues={toInitialValues(editing)}
            showCommission
            submitLabel={t('income.saveChanges')}
            onSubmit={handleEditSubmit}
            submitting={updateAppointment.isPending}
            submitError={editError}
          />
        )}
      </Dialog>
    </section>
  )
}
