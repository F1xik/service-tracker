import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { useAuth } from './useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Field'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

const makeSchema = (t: TFunction) =>
  z.object({
    email: z.string().email(t('validation.emailInvalid')),
    password: z.string().min(8, t('validation.passwordMin')),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

export default function SignInPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notice =
    location.state && typeof location.state === 'object' && 'notice' in location.state
      ? String((location.state as { notice: unknown }).notice)
      : null
  const [authError, setAuthError] = useState<string | null>(null)

  const schema = useMemo(() => makeSchema(t), [t])
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setAuthError(null)
    try {
      await signIn(values.email, values.password)
      navigate('/')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : t('auth.invalidCredentials'))
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[var(--color-bg)] px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary)]">
          <Wallet
            size={28}
            className="text-[var(--color-primary-fg)]"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-fg)]">
          {t('common.appName')}
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)]">{t('common.tagline')}</p>
      </div>

      <Card className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field
            id="email"
            label={t('auth.email')}
            required
            error={errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              error={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
          </Field>

          <Field
            id="password"
            label={t('auth.password')}
            required
            error={errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
          </Field>

          {notice && !authError && <Alert variant="info">{notice}</Alert>}
          {authError && <Alert variant="error">{authError}</Alert>}

          <Button type="submit" fullWidth loading={isSubmitting}>
            {t('auth.signIn')}
          </Button>
        </form>
      </Card>

      <p className="text-sm text-[var(--color-fg-muted)]">
        {t('auth.newHere')}{' '}
        <Link
          to="/sign-up"
          className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {t('auth.createAccount')}
        </Link>
      </p>

      <LanguageSwitcher className="w-40" />
    </div>
  )
}
