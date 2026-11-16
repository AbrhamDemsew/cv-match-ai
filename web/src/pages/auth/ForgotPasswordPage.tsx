import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { AuthCard } from '../../components/auth/AuthCard'
import { AuthConfigurationNotice } from '../../components/auth/AuthConfigurationNotice'
import { Button } from '../../components/common/Button'
import { FormAlert } from '../../components/forms/FormAlert'
import { FormField } from '../../components/forms/FormField'
import { useAuth } from '../../hooks/use-auth'
import { usePageTitle } from '../../hooks/use-page-title'
import { getAuthErrorMessage } from '../../lib/auth-errors'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '../../lib/validation/auth'
import { requestPasswordRecovery } from '../../services/auth.service'

export function ForgotPasswordPage() {
  usePageTitle('Forgot password')

  const { isConfigured } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    setSubmitError(null)
    setSent(false)

    try {
      const redirectUrl = `${window.location.origin}/reset-password`
      await requestPasswordRecovery(values.email, redirectUrl)
      setSent(true)
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your account email and we will send a password recovery link."
      footer={
        <p className="text-center text-sm text-slate-600">
          Remembered your password?{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {!isConfigured ? <AuthConfigurationNotice /> : null}
        {sent ? (
          <FormAlert tone="success" title="Check your inbox">
            If an account exists for that email, a recovery link is on its way. The link expires
            after one hour. Check your spam folder if it does not arrive.
          </FormAlert>
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

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={!isConfigured}
          className="mt-2"
        >
          <Mail className="size-4" aria-hidden="true" />
          Send recovery link
        </Button>
      </form>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        For privacy, we show the same confirmation whether or not an account exists for the email.
      </p>
    </AuthCard>
  )
}
