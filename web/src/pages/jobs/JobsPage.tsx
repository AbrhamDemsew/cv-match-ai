import { BriefcaseBusiness, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { ButtonLink } from '../../components/common/ButtonLink'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingCards } from '../../components/common/LoadingCards'
import { PageHeader } from '../../components/common/PageHeader'
import { DataConfigurationNotice } from '../../components/data/DataConfigurationNotice'
import { DataErrorState } from '../../components/data/DataErrorState'
import { FormAlert } from '../../components/forms/FormAlert'
import { useDeleteJob, useJobs } from '../../hooks/use-jobs'
import { usePageTitle } from '../../hooks/use-page-title'
import { DATA_LIST_LIMIT } from '../../lib/data-constants'
import { getDataErrorMessage } from '../../lib/data-errors'
import { environment } from '../../lib/env'
import type { Job } from '../../types/data'
import { formatDateTime } from '../../utils/format'

interface JobsLocationState {
  notice?: string
}

export function JobsPage() {
  usePageTitle('Job opportunities')
  const location = useLocation()
  const notice = (location.state as JobsLocationState | null)?.notice
  const { jobs, isLoading, isError, errorMessage, refetch } = useJobs()
  const { deleteJob, isDeleting } = useDeleteJob()
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null)
  const [deletionError, setDeletionError] = useState<string | null>(null)
  const [deletionNotice, setDeletionNotice] = useState<string | null>(null)
  const successNotice = deletionNotice ?? notice

  async function handleDelete() {
    if (!jobToDelete) {
      return
    }

    const title = jobToDelete.title
    setDeletionError(null)
    try {
      await deleteJob(jobToDelete.id)
      setJobToDelete(null)
      setDeletionNotice(`“${title}” was deleted.`)
    } catch (error) {
      setDeletionError(getDataErrorMessage(error))
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader
        eyebrow="Opportunities"
        title="Job opportunities"
        description="Save the roles you want to evaluate. Job descriptions and requirements are private to your account and ready for a later matching phase."
        actions={
          <ButtonLink to="/jobs/new">
            <Plus className="size-4" aria-hidden="true" />
            Add job
          </ButtonLink>
        }
      />

      <div className="mt-8 space-y-5">
        {successNotice ? <FormAlert tone="success">{successNotice}</FormAlert> : null}
        {!environment.isDataConfigured ? <DataConfigurationNotice /> : null}

        {environment.isDataConfigured && isError ? (
          <DataErrorState
            title="Your jobs could not be loaded"
            message={errorMessage ?? 'Check the Appwrite configuration and try again.'}
            onRetry={() => void refetch()}
          />
        ) : null}

        {environment.isDataConfigured && isLoading ? <LoadingCards label="Loading jobs" /> : null}

        {environment.isDataConfigured && !isLoading && !isError && jobs.length === 0 ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title="No jobs saved yet"
            description="Add a role with its description and requirements. You will be able to compare CVs against it in the analysis phase."
            action={
              <ButtonLink to="/jobs/new">
                <Plus className="size-4" aria-hidden="true" />
                Add your first job
              </ButtonLink>
            }
          />
        ) : null}

        {environment.isDataConfigured && !isLoading && !isError && jobs.length > 0 ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                    <BriefcaseBusiness className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs text-slate-500">Updated {formatDateTime(job.updatedAt)}</span>
                </div>
                <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">
                  <Link
                    to={`/jobs/${job.id}`}
                    className="hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                  >
                    {job.title}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-slate-600">{job.companyName || 'Company not specified'}</p>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
                  {job.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                  <Link
                    to={`/jobs/${job.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                  >
                    View
                  </Link>
                  <Link
                    to={`/jobs/${job.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit
                  </Link>
                  <Button
                    variant="ghost"
                    className="ml-auto text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    onClick={() => {
                      setDeletionError(null)
                      setDeletionNotice(null)
                      setJobToDelete(job)
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {environment.isDataConfigured && !isError && jobs.length >= DATA_LIST_LIMIT ? (
          <p className="text-xs leading-5 text-slate-500">
            Showing the most recent {DATA_LIST_LIMIT} jobs. Pagination is planned for a later phase.
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={jobToDelete !== null}
        title="Delete this job?"
        description="The job and all of its saved requirements will be removed. This cannot be undone."
        confirmLabel="Delete job"
        isPending={isDeleting}
        error={deletionError}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!isDeleting) {
            setJobToDelete(null)
            setDeletionError(null)
          }
        }}
      >
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">{jobToDelete?.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {jobToDelete?.companyName || 'Company not specified'}
          </p>
        </div>
      </ConfirmDialog>
    </div>
  )
}
