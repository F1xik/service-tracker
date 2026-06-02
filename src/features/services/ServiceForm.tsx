import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer'),
  price: z.coerce.number().positive('Price must be greater than 0'),
})

export type ServiceFormValues = z.infer<typeof schema>

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
  submitLabel = 'Save',
  currency,
}: ServiceFormProps) {
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
      <Field id="service-name" label="Name" required error={errors.name?.message}>
        <Input
          id="service-name"
          placeholder="e.g. Haircut"
          error={!!errors.name}
          aria-describedby={errors.name ? 'service-name-error' : undefined}
          {...register('name')}
        />
      </Field>

      <Field id="service-price" label="Price" required error={errors.price?.message}>
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
            placeholder="0.00"
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
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
