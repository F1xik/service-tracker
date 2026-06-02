import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'

const makeSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, t('validation.nameRequired'))
      .max(100, t('validation.nameMax')),
    price: z.coerce.number().positive(t('validation.pricePositive')),
  })

export type ServiceFormValues = z.infer<ReturnType<typeof makeSchema>>

interface ServiceFormProps {
  defaultValues?: Partial<ServiceFormValues>
  onSubmit: (values: ServiceFormValues) => void | Promise<void>
  onCancel: () => void
  submitting?: boolean
  submitError?: string | null
  submitLabel?: string
  currency?: string
}

export function ServiceForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitting = false,
  submitError,
  submitLabel,
  currency,
}: ServiceFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => makeSchema(t), [t])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      price: defaultValues?.price,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <Field
        id="service-name"
        label={t('services.name')}
        required
        error={errors.name?.message}
      >
        <Input
          id="service-name"
          placeholder={t('services.namePlaceholder')}
          error={!!errors.name}
          aria-describedby={errors.name ? 'service-name-error' : undefined}
          {...register('name')}
        />
      </Field>

      <Field
        id="service-price"
        label={t('services.price')}
        required
        error={errors.price?.message}
      >
        <div className="relative">
          {currency && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-fg-subtle)]">
              {currency}
            </span>
          )}
          <Input
            id="service-price"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder={t('services.pricePlaceholder')}
            error={!!errors.price}
            aria-describedby={errors.price ? 'service-price-error' : undefined}
            className={currency ? 'pl-14' : undefined}
            {...register('price')}
          />
        </div>
      </Field>

      {submitError && <Alert variant="error">{submitError}</Alert>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('services.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel ?? t('services.save')}
        </Button>
      </div>
    </form>
  )
}
