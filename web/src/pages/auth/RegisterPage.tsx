import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCard } from '../../components/auth/AuthCard'
import { AuthConfigurationNotice } from '../../components/auth/AuthConfigurationNotice'
import { AuthSessionCheckNotice } from '../../components/auth/AuthSessionCheckNotice'
import { Button } from '../../components/common/Button'
import { FormAlert } from '../../components/forms/FormAlert'
import { FormField } from '../../components/forms/FormField'
import { PasswordField } from '../../components/forms/PasswordField'
import { useAuth } from '../../hooks/use-auth'
import { usePageTitle } from '../../hooks/use-page-title'
import { getAuthErrorMessage } from '../../lib/auth-errors'
import { registerSchema, type RegisterFormValues } from '../../lib/validation/auth'
import type { AuthPageLocationState } from '../../types/auth'
import { getSafeRedirectPath } from '../../utils/redirect'

export function RegisterPage() {
  usePageTitle('Create account')

  const { register: registerAccount, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state ?? null) as AuthPageLocationState | null
  const redirectTo = getSafeRedirectPath(locationState?.from)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  })

  async function onSubmit(values: RegisterFormValues) {
    setSubmitError(null)

    try {
      const { name, email, password } = values
      await registerAccount({ name, email, password })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    }
  }

  return (
    <AuthCard
      title="Create your account"
      description="Set up a secure CVMatch AI account with your name, email, and password."
      footer={
        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to="/login"
            state={location.state}
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {!isConfigured ? <AuthConfigurationNotice /> : null}
        <AuthSessionCheckNotice />
        {submitError ? <FormAlert tone="error">{submitError}</FormAlert> : null}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-5">
        <FormField
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Alex Morgan"
          error={errors.name?.message}
          required
          {...register('name')}
        />

        <FormField
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          required
          {...register('email')}
        />

        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="Use 8–256 characters. Avoid your name, email, or other personal details."
          error={errors.password?.message}
          required
          {...register('password')}
        />

        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          required
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={!isConfigured}
          className="mt-2"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Create account
        </Button>
      </form>
    </AuthCard>
  )
}
