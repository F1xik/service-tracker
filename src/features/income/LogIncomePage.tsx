import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'

import { useProfile, useServices } from '@/features/services/useServices'
import { EntryForm, type EntryFormValues } from './EntryForm'
import { IncomeHistory } from './IncomeHistory'
import { useCreateAppointment } from './useIncome'

const DEFAULT_CURRENCY = 'PLN'

export default function LogIncomePage() {
  const { t } = useTranslation()
  const profileQuery = useProfile()
  const servicesQuery = useServices()
  const createAppointment = useCreateAppointment()

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  const currency = profileQuery.data?.currency ?? DEFAULT_CURRENCY
  const commissionPct = profileQuery.data?.commission_pct ?? 0
  const activeServices = (servicesQuery.data ?? []).filter((s) => s.active)

  async function handleSubmit(values: EntryFormValues) {
    setSubmitError(null)
    try {
      await createAppointment.mutateAsync({
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
      setFormKey((k) => k + 1) // remount the form to reset it
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('income.saveError'))
    }
  }

  const setupLoading = profileQuery.isLoading || servicesQuery.isLoading
  const setupError = profileQuery.isError || servicesQuery.isError

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-fg)]">
          {t('income.title')}
        </h1>
      </header>

      <section className="mb-8">
        {setupLoading ? (
          <div
            role="status"
            aria-label={t('income.loadingForm')}
            className="flex justify-center py-10 text-[var(--color-fg-muted)]"
          >
            <Spinner />
          </div>
        ) : setupError ? (
          <Alert variant="error">{t('income.loadServicesError')}</Alert>
        ) : activeServices.length === 0 ? (
          <Alert variant="info">
            {t('income.noActiveServicesPrefix')}{' '}
            <Link to="/services" className="font-medium underline underline-offset-4">
              {t('income.addServiceFirst')}
            </Link>{' '}
            {t('income.noActiveServicesSuffix')}
          </Alert>
        ) : (
          <Card>
            <EntryForm
              key={formKey}
              activeServices={activeServices}
              commissionPct={commissionPct}
              currency={currency}
              onSubmit={handleSubmit}
              submitting={createAppointment.isPending}
              submitError={submitError}
            />
          </Card>
        )}
      </section>

      <IncomeHistory
        currency={currency}
        activeServices={activeServices}
        commissionPct={commissionPct}
      />
    </div>
  )
}
