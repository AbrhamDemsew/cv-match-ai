import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/common/Button'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { DataConfigurationNotice } from '../../components/data/DataConfigurationNotice'
import { DataErrorState } from '../../components/data/DataErrorState'
import { FormAlert } from '../../components/forms/FormAlert'
import { FormField } from '../../components/forms/FormField'
import { useAuth } from '../../hooks/use-auth'
import { usePageTitle } from '../../hooks/use-page-title'
import { useProfile } from '../../hooks/use-profile'
import { getDataErrorMessage } from '../../lib/data-errors'
import { environment } from '../../lib/env'
import {
  profileFormSchema,
  type ProfileFormValues,
} from '../../lib/validation/profile'
import { formatDateTime } from '../../utils/format'

export function SettingsPage() {
  usePageTitle('Profile and settings')
  const { user } = useAuth()
  const {
    profile,
    isLoading,
    isError,
    errorMessage,
    refetch,
    updateProfile,
    isUpdating,
  } = useProfile()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { displayName: user?.name ?? '' },
  })

  useEffect(() => {
    if (profile) {
      reset({ displayName: profile.displayName })
    }
  }, [profile, reset])

  async function handleSubmitProfile(values: ProfileFormValues) {
    setSaveError(null)
    setSaved(false)

    try {
      const savedProfile = await updateProfile(values.displayName)
      setSaved(true)
      reset({ displayName: savedProfile.displayName })
    } catch (error) {
      setSaveError(getDataErrorMessage(error))
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader
        eyebrow="Account"
        title="Profile and settings"
        description="Your display name is stored in your private Appwrite profile record. Your email address comes from Appwrite Authentication and is managed separately."
      />

      <div className="mt-8 space-y-5">
        {!environment.isDataConfigured ? <DataConfigurationNotice /> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <UserRound className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Appwrite account
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Authentication identity used for row and file ownership.
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <dt className="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
                <Mail className="size-3.5" aria-hidden="true" />
                Email
              </dt>
              <dd className="mt-1.5 break-all text-sm font-medium text-slate-900">
                {user?.email ?? 'Unavailable'}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Email verification
              </dt>
              <dd className="mt-2">
                <StatusBadge tone={user?.emailVerification ? 'success' : 'warning'}>
                  {user?.emailVerification ? 'Verified' : 'Not verified'}
                </StatusBadge>
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Authentication name
              </dt>
              <dd className="mt-1.5 text-sm font-medium text-slate-900">
                {user?.name || 'Not set'}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Account created
              </dt>
              <dd className="mt-1.5 text-sm font-medium text-slate-900">
                {user ? formatDateTime(user.createdAt) : 'Unavailable'}
              </dd>
            </div>
          </dl>
        </section>

        {environment.isDataConfigured && isError ? (
          <DataErrorState
            title="Your profile could not be loaded"
            message={errorMessage ?? 'Check the Appwrite configuration and try again.'}
            onRetry={() => void refetch()}
          />
        ) : null}

        {saved && !isDirty ? (
          <FormAlert tone="success" title="Profile updated">
            Your display name was saved to Appwrite.
          </FormAlert>
        ) : null}

        {saveError ? <FormAlert tone="error">{saveError}</FormAlert> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                Private profile record
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                The profile row is created automatically when you open your workspace. Only your
                authenticated account has read, update, and delete permission on it.
              </p>
            </div>
          </div>

          {environment.isDataConfigured ? (
            <form
              className="mt-6 space-y-5"
              onSubmit={(event) => void handleSubmit(handleSubmitProfile)(event)}
              noValidate
            >
              <FormField
                label="Display name"
                required
                maxLength={128}
                disabled={isLoading || isError || !profile}
                hint={
                  isLoading
                    ? 'Loading your profile…'
                    : 'This name is stored in the profiles table and is not your account email.'
                }
                error={errors.displayName?.message}
                {...register('displayName')}
              />

              {profile ? (
                <p className="flex items-center gap-2 text-xs leading-5 text-slate-500">
                  <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                  Profile record created {formatDateTime(profile.createdAt)}.
                </p>
              ) : null}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={isUpdating}
                  disabled={!profile || isLoading || isError || !isDirty}
                >
                  Save profile
                </Button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  )
}
