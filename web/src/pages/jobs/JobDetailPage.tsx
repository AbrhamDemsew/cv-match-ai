import { ArrowLeft, BriefcaseBusiness, CalendarClock, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { LoadingCards } from '../../components/common/LoadingCards'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { DataConfigurationNotice } from '../../components/data/DataConfigurationNotice'
import { DataErrorState } from '../../components/data/DataErrorState'
import { FormAlert } from '../../components/forms/FormAlert'
import { useDeleteJob, useJob } from '../../hooks/use-jobs'
import { usePageTitle } from '../../hooks/use-page-title'
import {
  JOB_REQUIREMENT_CATEGORY_LABELS,
  JOB_REQUIREMENT_IMPORTANCE_LABELS,
} from '../../lib/data-constants'
import { getDataErrorMessage } from '../../lib/data-errors'
import { environment } from '../../lib/env'
import { formatDateTime, formatWeight } from '../../utils/format'

interface JobDetailLocationState {
  notice?: string
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const notice = (location.state as JobDetailLocationState | null)?.notice
  const { job, isLoading, isError, errorMessage, refetch } = useJob(jobId)
  const { deleteJob, isDeleting } = useDeleteJob()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletionError, setDeletionError] = useState<string | null>(null)

  usePageTitle(job && !isError ? job.title : 'Job details')

  async function handleDelete() {
    if (!job) {
      return
    }

    setDeletionError(null)
    try {
      await deleteJob(job.id)
      navigate('/jobs', {
        replace: true,
        state: { notice: `“${job.title}” was deleted.` },
      })
    } catch (error) {
      setDeletionError(getDataErrorMessage(error))
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader
        eyebrow="Job opportunity"
        title={job && !isError ? job.title : 'Job details'}
        description={
          job && !isError
            ? `${job.companyName || 'Company not specified'} · Saved ${formatDateTime(job.createdAt)}`
            : 'Review the saved job description and requirements.'
        }
        actions={
          <>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to jobs
            </Link>
            {job && !isError ? (
              <>
                <Link
                  to={`/jobs/${job.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit job
                </Link>
                <Button
                  variant="ghost"
                  className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  onClick={() => {
                    setDeletionError(null)
                    setConfirmDelete(true)
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <div className="mt-8 space-y-5">
        {notice ? <FormAlert tone="success">{notice}</FormAlert> : null}
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

        {job && !isError ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Job description
                </h2>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                  {job.description}
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Responsibilities
                </h2>
                {job.responsibilities ? (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                    {job.responsibilities}
                  </p>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    No responsibilities were saved separately.
                  </p>
                )}
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                    Requirements
                  </h2>
                  <StatusBadge tone="info">{job.requirements.length}</StatusBadge>
                </div>

                {job.requirements.length === 0 ? (
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    No requirements saved yet. Edit the job to add them.
                  </p>
                ) : (
                  <ol className="mt-4 space-y-3">
                    {job.requirements.map((requirement) => (
                      <li
                        key={requirement.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            tone={requirement.importance === 'required' ? 'warning' : 'neutral'}
                          >
                            {JOB_REQUIREMENT_IMPORTANCE_LABELS[requirement.importance]}
                          </StatusBadge>
                          <span className="text-xs text-slate-500">
                            {JOB_REQUIREMENT_CATEGORY_LABELS[requirement.category]}
                          </span>
                          <span className="ml-auto text-xs text-slate-500">
                            Weight {formatWeight(requirement.weight)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-800">
                          {requirement.description}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <CalendarClock className="size-4 text-slate-500" aria-hidden="true" />
                  Record details
                </h2>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Created {formatDateTime(job.createdAt)}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Last updated {formatDateTime(job.updatedAt)}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
                  Private to your account
                </p>
              </section>
            </aside>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmDelete && !isError && job !== null}
        title="Delete this job?"
        description="The job and all of its saved requirements will be removed. This cannot be undone."
        confirmLabel="Delete job"
        isPending={isDeleting}
        error={deletionError}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!isDeleting) {
            setConfirmDelete(false)
            setDeletionError(null)
          }
        }}
      >
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{job?.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {job?.companyName || 'Company not specified'}
          </p>
        </div>
      </ConfirmDialog>
    </div>
  )
}
