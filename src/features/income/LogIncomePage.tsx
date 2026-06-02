import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/format'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'

import { useProfile, useServices } from '@/features/services/useServices'
import { EntryForm, type EntryFormValues } from './EntryForm'
import { useCreateEntries, useDeleteEntry, useEntries } from './useIncome'

const DEFAULT_CURRENCY = 'PLN'

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

export default function LogIncomePage() {
  const profileQuery = useProfile()
  const servicesQuery = useServices()
  const entriesQuery = useEntries()
  const createEntries = useCreateEntries()
  const deleteEntry = useDeleteEntry()

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  const currency = profileQuery.data?.currency ?? DEFAULT_CURRENCY
  const commissionPct = profileQuery.data?.commission_pct ?? 0
  const activeServices = (servicesQuery.data ?? []).filter((s) => s.active)

  async function handleSubmit(values: EntryFormValues) {
    setSubmitError(null)
    try {
      await createEntries.mutateAsync({
        provided_on: values.provided_on,
        customer: values.customer.trim() || null,
        note: values.note.trim() || null,
        commissionPct,
        lines: values.lines.map((line) => ({
          service_id: line.service_id,
          price: Number(line.price),
        })),
      })
      setFormKey((k) => k + 1) // remount the form to reset it
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save income.')
    }
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return
    deleteEntry.mutate(id)
  }

  const setupLoading = profileQuery.isLoading || servicesQuery.isLoading
  const setupError = profileQuery.isError || servicesQuery.isError

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-fg)]">
          Log income
        </h1>
      </header>

      <section className="mb-8">
        {setupLoading ? (
          <div
            role="status"
            aria-label="Loading form"
            className="flex justify-center py-10 text-[var(--color-fg-muted)]"
          >
            <Spinner />
          </div>
        ) : setupError ? (
          <Alert variant="error">Could not load your services. Please try again.</Alert>
        ) : activeServices.length === 0 ? (
          <Alert variant="info">
            You have no active services yet.{' '}
            <Link to="/services" className="font-medium underline underline-offset-4">
              Add a service first
            </Link>{' '}
            to start logging income.
          </Alert>
        ) : (
          <Card>
            <EntryForm
              key={formKey}
              activeServices={activeServices}
              commissionPct={commissionPct}
              currency={currency}
              onSubmit={handleSubmit}
              submitting={createEntries.isPending}
              submitError={submitError}
            />
          </Card>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-fg)]">Recent</h2>

        {entriesQuery.isLoading ? (
          <div
            role="status"
            aria-label="Loading entries"
            className="flex justify-center py-10 text-[var(--color-fg-muted)]"
          >
            <Spinner />
          </div>
        ) : entriesQuery.isError ? (
          <Alert variant="error">
            {entriesQuery.error instanceof Error
              ? entriesQuery.error.message
              : 'Could not load entries.'}
          </Alert>
        ) : entriesQuery.data && entriesQuery.data.length > 0 ? (
          <Card className="p-0">
            <ul className="divide-y divide-[var(--color-border)]">
              {entriesQuery.data.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 grow">
                    <div className="truncate font-medium text-[var(--color-fg)]">
                      {entry.service?.name ?? 'Service'}
                    </div>
                    <div className="text-sm text-[var(--color-fg-muted)]">
                      {formatDate(entry.provided_on)}
                      {entry.customer ? ` · ${entry.customer}` : ''}
                    </div>
                  </div>
                  <span className="tabular-nums font-medium text-[var(--color-fg)]">
                    {formatPrice(entry.amount_earned, currency)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete entry"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <p className="text-center text-sm text-[var(--color-fg-muted)]">
              No entries yet. Log your first one above.
            </p>
          </Card>
        )}
      </section>
    </div>
  )
}
