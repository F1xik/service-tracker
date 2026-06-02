import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Wallet } from 'lucide-react'

import { useAuth } from './useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Field } from '@/components/ui/Field'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().max(100).optional(),
})

type FormValues = z.infer<typeof schema>

export default function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setAuthError(null)
    try {
      await signUp(values.email, values.password, values.displayName || undefined)
      navigate('/sign-in')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not create account.')
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
          Income
        </h1>
        <p className="text-sm text-[var(--color-fg-muted)]">Track what you earn.</p>
      </div>

      <Card className="w-full max-w-sm">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <Field id="email" label="Email" required error={errors.email?.message}>
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
            label="Password"
            required
            error={errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
          </Field>

          <Field
            id="displayName"
            label="Display name"
            error={errors.displayName?.message}
            helper="Optional — shown on your profile"
          >
            <Input
              id="displayName"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              {...register('displayName')}
            />
          </Field>

          {authError && <Alert variant="error">{authError}</Alert>}

          <Button type="submit" fullWidth loading={isSubmitting}>
            Create account
          </Button>
        </form>
      </Card>

      <p className="text-sm text-[var(--color-fg-muted)]">
        Already have an account?{' '}
        <Link
          to="/sign-in"
          className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
