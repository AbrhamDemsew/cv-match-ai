import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoadingCards } from '../../components/common/LoadingCards'
import { PageHeader } from '../../components/common/PageHeader'
import { DataConfigurationNotice } from '../../components/data/DataConfigurationNotice'
import { DataErrorState } from '../../components/data/DataErrorState'
import { JobForm } from '../../components/jobs/JobForm'
import { useJob, useUpdateJob } from '../../hooks/use-jobs'
import { usePageTitle } from '../../hooks/use-page-title'
import { getDataErrorMessage } from '../../lib/data-errors'
import { environment } from '../../lib/env'
import { toJobFormValues, toJobInput } from '../../lib/job-input'
import type { JobFormValues } from '../../lib/validation/jobs'

export function EditJobPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { job, isLoading, isError, errorMessage, refetch } = useJob(jobId)
  const { updateJob, isUpdating } = useUpdateJob(jobId ?? '')
  const [submitError, setSubmitError] = useState<string | null>(null)

  usePageTitle(job && !isError ? `Edit ${job.title}` : 'Edit job')

  async function handleSubmit(values: JobFormValues) {
    if (!jobId) {
      return
    }

    setSubmitError(null)
    try {
      await updateJob(toJobInput(values))
      navigate(`/jobs/${jobId}`, {
        replace: true,
        state: { notice: 'The job was updated.' },
      })
    } catch (error) {
      setSubmitError(getDataErrorMessage(error))
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader
        eyebrow="Job opportunities"
        title="Edit job"
        description="Update the saved description or requirements. Existing requirement references are verified against this job before changes are committed."
        actions={
          <Link
            to={jobId ? `/jobs/${jobId}` : '/jobs'}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Cancel editing
          </Link>
        }
      />

      <div className="mt-8 space-y-5">
        {!environment.isDataConfigured ? <DataConfigurationNotice /> : null}

        {environment.isDataConfigured && !jobId ? (
          <DataErrorState title="Job not specified" message="Open a job from your job list first." />
        ) : null}

        {environment.isDataConfigured && jobId && isLoading ? (
          <LoadingCards count={2} label="Loading job" />
        ) : null}

        {environment.isDataConfigured && jobId && isError ? (
          <DataErrorState
            title="This job could not be loaded"
            message={errorMessage ?? 'Check the Appwrite configuration and try again.'}
            onRetry={() => void refetch()}
          />
        ) : null}

        {environment.isDataConfigured && jobId && !isLoading && !isError && job ? (
          <JobForm
            key={job.id}
            initialValues={toJobFormValues(job)}
            submitLabel="Save changes"
            isSubmitting={isUpdating}
            submitError={submitError}
            onSubmit={handleSubmit}
          />
        ) : null}
      </div>
    </div>
  )
}
