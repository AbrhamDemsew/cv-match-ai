import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn } from 'lucide-react'
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
import { loginSchema, type LoginFormValues } from '../../lib/validation/auth'
import type { AuthPageLocationState } from '../../types/auth'
import { getSafeRedirectPath } from '../../utils/redirect'

export function LoginPage() {
  usePageTitle('Sign in')

  const { login, isConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state ?? null) as AuthPageLocationState | null
  const redirectTo = getSafeRedirectPath(locationState?.from)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  })

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null)

    try {
      await login(values)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    }
  }

  return (
    <AuthCard
      title="Sign in"
      description="Use your CVMatch AI account to open your workspace."
      footer={
        <p className="text-center text-sm text-slate-600">
          New to CVMatch AI?{' '}
          <Link
            to="/register"
            state={location.state}
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {!isConfigured ? <AuthConfigurationNotice /> : null}
        <AuthSessionCheckNotice />

        {locationState?.signedOut ? (
          <FormAlert tone="success">You have been signed out securely.</FormAlert>
        ) : null}

        {locationState?.message ? (
          <FormAlert tone="success">{locationState.message}</FormAlert>
        ) : null}

        {submitError ? <FormAlert tone="error">{submitError}</FormAlert> : null}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-5">
        <FormField
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          required
          {...register('email')}
        />

        <div>
          <PasswordField
            label="Password"
            autoComplete="current-password"
            error={errors.password?.message}
            required
            {...register('password')}
          />
          <div className="mt-2 flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={!isConfigured}
          className="mt-2"
        >
          <LogIn className="size-4" aria-hidden="true" />
          Sign in
        </Button>
      </form>
    </AuthCard>
  )
}
