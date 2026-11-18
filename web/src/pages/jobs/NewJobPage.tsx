import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader'
import { DataConfigurationNotice } from '../../components/data/DataConfigurationNotice'
import { JobForm } from '../../components/jobs/JobForm'
import { useCreateJob } from '../../hooks/use-jobs'
import { usePageTitle } from '../../hooks/use-page-title'
import { emptyJobFormValues, toJobInput } from '../../lib/job-input'
import { environment } from '../../lib/env'
import { getDataErrorMessage } from '../../lib/data-errors'
import type { JobFormValues } from '../../lib/validation/jobs'

export function NewJobPage() {
  usePageTitle('Add job')
  const navigate = useNavigate()
  const { createJob, isCreating } = useCreateJob()
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleSubmit(values: JobFormValues) {
    setSubmitError(null)
    try {
      const jobId = await createJob(toJobInput(values))
      navigate(`/jobs/${jobId}`, {
        replace: true,
        state: { notice: 'The job was created.' },
      })
    } catch (error) {
      setSubmitError(getDataErrorMessage(error))
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader
        eyebrow="Job opportunities"
        title="Add a job"
        description="Save the description and the requirements you want to compare against. Nothing is sent to Gemini in this phase."
        actions={
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to jobs
          </Link>
        }
      />

      <div className="mt-8 space-y-5">
        {!environment.isDataConfigured ? <DataConfigurationNotice /> : null}
        {environment.isDataConfigured ? (
          <JobForm
            initialValues={emptyJobFormValues}
            submitLabel="Create job"
            isSubmitting={isCreating}
            submitError={submitError}
            onSubmit={handleSubmit}
          />
        ) : null}
      </div>
    </div>
  )
}
