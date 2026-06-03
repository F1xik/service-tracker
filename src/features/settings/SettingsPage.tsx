import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Field'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

import { useProfile, useUpdateProfile } from '@/features/services/useServices'

const makeCommissionSchema = (t: TFunction) =>
  z.object({
    commission_pct: z.coerce
      .number()
      .min(0, t('validation.commissionRange'))
      .max(100, t('validation.commissionRange')),
  })

type CommissionValues = z.infer<ReturnType<typeof makeCommissionSchema>>

/** Language preference picker — persists to localStorage via the detector. */
function LanguageSettings() {
  const { t } = useTranslation()
  return (
    <Card>
      <Field id="language-switcher" label={t('settings.language')}>
        <LanguageSwitcher className="max-w-xs" />
      </Field>
    </Card>
  )
}

function CommissionSettings() {
  const { t } = useTranslation()
  const profileQuery = useProfile()
  const updateProfile = useUpdateProfile()
  const [saved, setSaved] = useState(false)

  const schema = useMemo(() => makeCommissionSchema(t), [t])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommissionValues>({
    resolver: zodResolver(schema),
    values: { commission_pct: profileQuery.data?.commission_pct ?? 0 },
  })

  async function onSubmit(values: CommissionValues) {
    setSaved(false)
    await updateProfile.mutateAsync({ commission_pct: values.commission_pct })
    setSaved(true)
  }

  return (
    <Card>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Field
          id="commission"
          label={t('settings.commissionLabel')}
          required
          error={errors.commission_pct?.message}
        >
          <div className="relative max-w-40">
            <Input
              id="commission"
              type="number"
              step="0.1"
              min="0"
              max="100"
              inputMode="decimal"
              error={!!errors.commission_pct}
              className="pr-9"
              {...register('commission_pct')}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-fg-subtle)]">
              %
            </span>
          </div>
        </Field>

        <Alert variant="info">{t('settings.commissionInfo')}</Alert>

        {updateProfile.isError && (
          <Alert variant="error">
            {updateProfile.error instanceof Error
              ? updateProfile.error.message
              : t('settings.saveCommissionError')}
          </Alert>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={updateProfile.isPending}>
            {t('services.save')}
          </Button>
          {saved && !updateProfile.isPending && (
            <span className="text-sm text-[var(--color-positive)]">
              {t('services.saved')}
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-fg)]">
          {t('settings.title')}
        </h1>
      </header>

      <div className="space-y-4">
        <LanguageSettings />
        <CommissionSettings />
      </div>
    </div>
  )
}
