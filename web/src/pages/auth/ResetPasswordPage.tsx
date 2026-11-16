import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthCard } from '../../components/auth/AuthCard'
import { AuthConfigurationNotice } from '../../components/auth/AuthConfigurationNotice'
import { Button } from '../../components/common/Button'
import { FormAlert } from '../../components/forms/FormAlert'
import { PasswordField } from '../../components/forms/PasswordField'
import { useAuth } from '../../hooks/use-auth'
import { usePageTitle } from '../../hooks/use-page-title'
import { getAuthErrorMessage } from '../../lib/auth-errors'
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '../../lib/validation/auth'
import { completePasswordRecovery } from '../../services/auth.service'

export function ResetPasswordPage() {
  usePageTitle('Set a new password')

  const { isConfigured } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const userId = searchParams.get('userId')
  const secret = searchParams.get('secret')
  const hasRecoveryToken = Boolean(userId && secret)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onTouched',
  })

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!userId || !secret) {
      return
    }

    setSubmitError(null)

    try {
      await completePasswordRecovery({ userId, secret, password: values.password })
      navigate('/login', {
        replace: true,
        state: { message: 'Your password has been updated. Sign in with your new password.' },
      })
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    }
  }

  if (!hasRecoveryToken) {
    return (
      <AuthCard
        title="Recovery link required"
        description="This page needs a valid recovery link from your email."
        footer={
          <p className="text-center text-sm text-slate-600">
            <Link
              to="/forgot-password"
              className="font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              Request a new recovery link
            </Link>
          </p>
        }
      >
        <FormAlert tone="error" title="This link is incomplete">
          The recovery link is missing its user or secret parameter. Request a new email and open
          the newest link.
        </FormAlert>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a new password for your CVMatch AI account."
      footer={
        <p className="text-center text-sm text-slate-600">
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
        {submitError ? <FormAlert tone="error">{submitError}</FormAlert> : null}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-5">
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint="Use 8–256 characters. Avoid your name, email, or other personal details."
          error={errors.password?.message}
          required
          {...register('password')}
        />

        <PasswordField
          label="Confirm new password"
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
          <KeyRound className="size-4" aria-hidden="true" />
          Update password
        </Button>
      </form>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Recovery links expire after one hour and can be used only once.
      </p>
    </AuthCard>
  )
}
