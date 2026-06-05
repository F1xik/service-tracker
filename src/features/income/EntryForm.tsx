import { useMemo } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { computeEarnings, computeTakeHome, type Service } from '@/lib/calc'
import { formatPrice } from '@/lib/format'
import { todayLocal } from '@/lib/date'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'

const makeSchema = (t: TFunction) =>
  z.object({
    provided_on: z.string().min(1, t('validation.dateRequired')),
    customer: z.string().trim().max(100, t('validation.customerMax')),
    note: z.string().trim().max(500, t('validation.noteMax')),
    tip: z.coerce.number().nonnegative(t('validation.tipNonnegative')),
    commission: z.coerce
      .number()
      .min(0, t('validation.commissionRange'))
      .max(100, t('validation.commissionRange')),
    lines: z
      .array(
        z.object({
          service_id: z.string().min(1, t('validation.pickService')),
          price: z.coerce.number().positive(t('validation.pricePositive')),
        }),
      )
      .min(1, t('validation.addAtLeastOneService')),
  })

export type EntryFormValues = z.infer<ReturnType<typeof makeSchema>>

const selectClassName = [
  'h-11 w-full rounded-[var(--radius-md)] border px-3 text-base text-[var(--color-fg)]',
  'bg-[var(--color-surface)] outline-none transition-colors duration-[var(--duration-fast)]',
  'focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-0',
  'border-[var(--color-border-strong)] hover:border-[var(--color-fg-muted)]',
].join(' ')

interface EntryFormProps {
  activeServices: Service[]
  /** Default commission % for new entries (from the profile). */
  commissionPct: number
  currency: string
  onSubmit: (values: EntryFormValues) => void | Promise<void>
  submitting?: boolean
  submitError?: string | null
  /** Prefilled values for edit mode; omit to start a blank create form. */
  initialValues?: EntryFormValues
  /** Show an editable commission % field (edit mode). */
  showCommission?: boolean
  /** Submit button label; defaults to "Log income". */
  submitLabel?: string
}

export function EntryForm({
  activeServices,
  commissionPct,
  currency,
  onSubmit,
  submitting = false,
  submitError,
  initialValues,
  showCommission = false,
  submitLabel,
}: EntryFormProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const schema = useMemo(() => makeSchema(t), [t])
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? {
      provided_on: todayLocal(),
      customer: '',
      note: '',
      tip: undefined as unknown as number,
      commission: commissionPct,
      lines: [{ service_id: '', price: undefined as unknown as number }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })

  const lines = useWatch({ control, name: 'lines' })
  const tipValue = useWatch({ control, name: 'tip' })
  const commissionValue = useWatch({ control, name: 'commission' })
  // Earnings preview tracks the live commission field so edits update the
  // per-line "you earn" amounts and the total immediately.
  const effectiveCommission = Number.isFinite(Number(commissionValue))
    ? Number(commissionValue)
    : commissionPct
  const earnedTotal = lines.reduce((sum, line) => {
    const price = Number(line?.price)
    return (
      sum +
      (Number.isFinite(price) && price > 0
        ? computeEarnings(price, effectiveCommission)
        : 0)
    )
  }, 0)
  const tip = Number(tipValue)
  const total = computeTakeHome(earnedTotal, Number.isFinite(tip) && tip > 0 ? tip : 0)

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="provided_on"
          label={t('income.date')}
          required
          error={errors.provided_on?.message}
        >
          <Input
            id="provided_on"
            type="date"
            className="min-w-0 appearance-none"
            error={!!errors.provided_on}
            aria-describedby={errors.provided_on ? 'provided_on-error' : undefined}
            {...register('provided_on')}
          />
        </Field>

        <Field
          id="customer"
          label={t('income.customer')}
          error={errors.customer?.message}
        >
          <Input
            id="customer"
            placeholder={t('income.customerPlaceholder')}
            error={!!errors.customer}
            aria-describedby={errors.customer ? 'customer-error' : undefined}
            {...register('customer')}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="note" label={t('income.note')} error={errors.note?.message}>
          <Input
            id="note"
            placeholder={t('income.notePlaceholder')}
            error={!!errors.note}
            aria-describedby={errors.note ? 'note-error' : undefined}
            {...register('note')}
          />
        </Field>

        <Field id="tip" label={t('income.tip')} error={errors.tip?.message}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-fg-subtle)]">
              {currency}
            </span>
            <Input
              id="tip"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder={t('income.tipPlaceholder')}
              error={!!errors.tip}
              className="pl-14"
              aria-describedby={errors.tip ? 'tip-error' : undefined}
              {...register('tip')}
            />
          </div>
        </Field>
      </div>

      {showCommission && (
        <Field
          id="commission"
          label={t('income.commission')}
          error={errors.commission?.message}
        >
          <div className="relative">
            <Input
              id="commission"
              type="number"
              step="0.01"
              min="0"
              max="100"
              inputMode="decimal"
              error={!!errors.commission}
              className="pr-9"
              aria-describedby={errors.commission ? 'commission-error' : undefined}
              {...register('commission')}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-fg-subtle)]">
              %
            </span>
          </div>
        </Field>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--color-fg)]">
            {t('income.services')}
          </h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              append({ service_id: '', price: undefined as unknown as number })
            }
          >
            <Plus size={16} aria-hidden="true" />
            {t('income.addService')}
          </Button>
        </div>

        {errors.lines?.root && (
          <Alert variant="error">{errors.lines.root.message}</Alert>
        )}

        {fields.map((field, index) => {
          const lineErrors = errors.lines?.[index]
          const price = Number(lines?.[index]?.price)
          const earned =
            Number.isFinite(price) && price > 0
              ? computeEarnings(price, effectiveCommission)
              : 0
          const serviceReg = register(`lines.${index}.service_id`)

          return (
            <div
              key={field.id}
              className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
            >
              <div className="flex items-start gap-3">
                <div className="grid min-w-0 grow grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    id={`service-${index}`}
                    label={t('income.service')}
                    required
                    error={lineErrors?.service_id?.message}
                  >
                    <select
                      id={`service-${index}`}
                      className={selectClassName}
                      aria-invalid={lineErrors?.service_id ? true : undefined}
                      {...serviceReg}
                      onChange={(e) => {
                        serviceReg.onChange(e)
                        const svc = activeServices.find((s) => s.id === e.target.value)
                        if (svc) {
                          setValue(`lines.${index}.price`, svc.price, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                      }}
                    >
                      <option value="">{t('income.selectService')}</option>
                      {activeServices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    id={`price-${index}`}
                    label={t('income.price')}
                    required
                    error={lineErrors?.price?.message}
                  >
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-fg-subtle)]">
                        {currency}
                      </span>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        placeholder={t('income.pricePlaceholder')}
                        error={!!lineErrors?.price}
                        className="pl-14"
                        {...register(`lines.${index}.price`)}
                      />
                    </div>
                  </Field>
                </div>

                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('income.removeService', { number: index + 1 })}
                    onClick={() => remove(index)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </Button>
                )}
              </div>

              <p className="mt-2 text-xs text-[var(--color-fg-muted)]">
                {t('income.youEarn')}{' '}
                <span className="font-medium tabular-nums text-[var(--color-fg)]">
                  {formatPrice(earned, currency, locale)}
                </span>{' '}
                {t('income.commissionNote', { pct: effectiveCommission })}
              </p>
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4">
        <span className="text-sm text-[var(--color-fg-muted)]">
          {t('income.totalEarned')}
        </span>
        <span className="text-lg font-semibold tabular-nums text-[var(--color-fg)]">
          {formatPrice(total, currency, locale)}
        </span>
      </div>

      {submitError && <Alert variant="error">{submitError}</Alert>}

      <Button type="submit" loading={submitting} fullWidth>
        {submitLabel ?? t('income.logIncome')}
      </Button>
    </form>
  )
}
