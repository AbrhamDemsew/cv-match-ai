import { FilePlus2, FileText, LockKeyhole, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { ButtonLink } from '../../components/common/ButtonLink'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingCards } from '../../components/common/LoadingCards'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge, type StatusTone } from '../../components/common/StatusBadge'
import { DataConfigurationNotice } from '../../components/data/DataConfigurationNotice'
import { DataErrorState } from '../../components/data/DataErrorState'
import { Button } from '../../components/common/Button'
import { FormAlert } from '../../components/forms/FormAlert'
import { usePageTitle } from '../../hooks/use-page-title'
import { useResumes } from '../../hooks/use-resumes'
import {
  DATA_LIST_LIMIT,
  RESUME_EXTRACTION_STATUS_LABELS,
  type ResumeExtractionStatus,
} from '../../lib/data-constants'
import { getDataErrorMessage } from '../../lib/data-errors'
import { environment } from '../../lib/env'
import type { Resume } from '../../types/data'
import { formatDateTime, formatFileSize } from '../../utils/format'

interface ResumesLocationState {
  notice?: string
}

function statusTone(status: ResumeExtractionStatus): StatusTone {
  switch (status) {
    case 'completed':
      return 'success'
    case 'failed':
      return 'danger'
    case 'processing':
      return 'warning'
    default:
      return 'info'
  }
}

export function ResumesPage() {
  usePageTitle('CV library')
  const location = useLocation()
  const notice = (location.state as ResumesLocationState | null)?.notice
  const {
    resumes,
    isLoading,
    isError,
    errorMessage,
    refetch,
    deleteResume,
    isDeleting,
  } = useResumes()
  const [resumeToDelete, setResumeToDelete] = useState<Resume | null>(null)
  const [deletionError, setDeletionError] = useState<string | null>(null)
  const [deletionNotice, setDeletionNotice] = useState<string | null>(null)
  const successNotice = deletionNotice ?? notice

  async function handleDelete() {
    if (!resumeToDelete) {
      return
    }

    const filename = resumeToDelete.originalFilename
    setDeletionError(null)
    try {
      await deleteResume(resumeToDelete.id)
      setResumeToDelete(null)
      setDeletionNotice(`“${filename}” was deleted from your private CV library.`)
    } catch (error) {
      setDeletionError(getDataErrorMessage(error))
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader
        eyebrow="Private documents"
        title="CV library"
        description="Upload PDF CVs to private Appwrite Storage. File access is restricted to your account; no public download URL is created."
        actions={
          <ButtonLink to="/resumes/new">
            <FilePlus2 className="size-4" aria-hidden="true" />
            Upload CV
          </ButtonLink>
        }
      />

      <div className="mt-8 space-y-5">
        {successNotice ? <FormAlert tone="success">{successNotice}</FormAlert> : null}

        {!environment.isDataConfigured ? <DataConfigurationNotice /> : null}

        {environment.isDataConfigured && isError ? (
          <DataErrorState
            title="Your CV library could not be loaded"
            message={errorMessage ?? 'Check the Appwrite configuration and try again.'}
            onRetry={() => void refetch()}
          />
        ) : null}

        {environment.isDataConfigured && isLoading ? <LoadingCards label="Loading CVs" /> : null}

        {environment.isDataConfigured && !isLoading && !isError && resumes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No CVs uploaded yet"
            description="Add a PDF to start building your private CV library. This phase stores the file and its metadata; text extraction and analysis come later."
            action={
              <ButtonLink to="/resumes/new">
                <FilePlus2 className="size-4" aria-hidden="true" />
                Upload your first CV
              </ButtonLink>
            }
          />
        ) : null}

        {environment.isDataConfigured && !isLoading && !isError && resumes.length > 0 ? (
          <ul className="space-y-3">
            {resumes.map((resume) => (
              <li
                key={resume.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <FileText className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">
                        {resume.originalFilename}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {formatFileSize(resume.fileSize)} · Uploaded{' '}
                        {formatDateTime(resume.createdAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={statusTone(resume.extractionStatus)}>
                          {RESUME_EXTRACTION_STATUS_LABELS[resume.extractionStatus]}
                        </StatusBadge>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <LockKeyhole className="size-3.5" aria-hidden="true" />
                          Private file
                        </span>
                        <span className="text-xs text-slate-500">
                          {resume.pageCount
                            ? `${resume.pageCount} pages`
                            : 'Page count available after extraction'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                    onClick={() => {
                      setDeletionError(null)
                      setDeletionNotice(null)
                      setResumeToDelete(resume)
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

        {environment.isDataConfigured && !isError && resumes.length >= DATA_LIST_LIMIT ? (
          <p className="text-xs leading-5 text-slate-500">
            Showing the most recent {DATA_LIST_LIMIT} CVs. Pagination is planned for a later phase.
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={resumeToDelete !== null}
        title="Delete this CV?"
        description="The private file and its metadata record will be removed. This cannot be undone."
        confirmLabel="Delete CV"
        isPending={isDeleting}
        error={deletionError}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!isDeleting) {
            setResumeToDelete(null)
            setDeletionError(null)
          }
        }}
      >
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 break-words">
          {resumeToDelete?.originalFilename}
        </div>
      </ConfirmDialog>
    </div>
  )
}
