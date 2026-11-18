import {
  ArrowRight,
  BriefcaseBusiness,
  FileSearch,
  FileText,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '../../components/common/ButtonLink'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { DataConfigurationNotice } from '../../components/data/DataConfigurationNotice'
import { FormAlert } from '../../components/forms/FormAlert'
import { useAuth } from '../../hooks/use-auth'
import { useJobs } from '../../hooks/use-jobs'
import { usePageTitle } from '../../hooks/use-page-title'
import { useProfile } from '../../hooks/use-profile'
import { useResumes } from '../../hooks/use-resumes'
import { DATA_LIST_LIMIT } from '../../lib/data-constants'
import { environment } from '../../lib/env'
import { getInitials } from '../../utils/user'

const upcomingPhases = [
  {
    title: 'PDF extraction and requirement matching',
    description:
      'Extract evidence from a CV and compare it with each saved requirement in a trusted Appwrite Function.',
    badge: 'Planned',
  },
  {
    title: 'Explainable results and reports',
    description:
      'Review scores based on evidence, gaps, recommendations, and downloadable PDF reports.',
    badge: 'Planned',
  },
] as const

export function DashboardPage() {
  usePageTitle('Dashboard')

  const { user } = useAuth()
  const {
    profile,
    isLoading: profileLoading,
    isError: profileError,
    errorMessage: profileErrorMessage,
  } = useProfile()
  const {
    resumes,
    isLoading: resumesLoading,
    isError: resumesError,
    errorMessage: resumesErrorMessage,
  } = useResumes()
  const {
    jobs,
    isLoading: jobsLoading,
    isError: jobsError,
    errorMessage: jobsErrorMessage,
  } = useJobs()

  const displayName = profile?.displayName || user?.name.trim() || user?.email || 'there'
  const firstName = displayName.split(/\s+/)[0] || 'there'
  const resumeCount = !environment.isDataConfigured
    ? '—'
    : resumesLoading
      ? '…'
      : resumesError
        ? '—'
        : resumes.length >= DATA_LIST_LIMIT
          ? `${DATA_LIST_LIMIT}+`
          : String(resumes.length)
  const jobCount = !environment.isDataConfigured
    ? '—'
    : jobsLoading
      ? '…'
      : jobsError
        ? '—'
        : jobs.length >= DATA_LIST_LIMIT
          ? `${DATA_LIST_LIMIT}+`
          : String(jobs.length)
  const workspaceError = profileError
    ? profileErrorMessage
    : resumesError
      ? resumesErrorMessage
      : jobsError
        ? jobsErrorMessage
        : null
  const profileStatus = !environment.isDataConfigured
    ? 'Not configured'
    : profileError
      ? 'Unavailable'
      : profileLoading
        ? 'Loading…'
        : profile
          ? 'Saved'
          : 'Not created'

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${firstName}.`}
        description="Your private CV library and saved job opportunities are ready. Analysis and reports remain intentionally unavailable until their phases are implemented."
        actions={
          <>
            <ButtonLink to="/resumes/new">
              <UploadCloud className="size-4" aria-hidden="true" />
              Upload CV
            </ButtonLink>
            <ButtonLink to="/jobs/new" variant="secondary">
              <Plus className="size-4" aria-hidden="true" />
              Add job
            </ButtonLink>
          </>
        }
      />

      <div className="mt-8 space-y-6">
        {!environment.isDataConfigured ? <DataConfigurationNotice /> : null}

        {environment.isDataConfigured && workspaceError ? (
          <FormAlert tone="error" title="Some workspace data could not be loaded">
            {workspaceError} Open the relevant workspace page or the system check for more detail.
          </FormAlert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div className="space-y-6">
            <section
              aria-labelledby="workspace-heading"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
            >
              <h2
                id="workspace-heading"
                className="text-lg font-semibold tracking-tight text-slate-950"
              >
                Workspace
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Counts come from your persisted Appwrite records. No scores or results are
                fabricated.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Link
                  to="/resumes"
                  className="group rounded-xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-white text-brand-700 ring-1 ring-slate-200">
                      <FileText className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-3xl font-semibold tracking-tight text-slate-950">
                      {resumeCount}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">Private CVs</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    Open CV library
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </p>
                </Link>

                <Link
                  to="/jobs"
                  className="group rounded-xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-white text-brand-700 ring-1 ring-slate-200">
                      <BriefcaseBusiness className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-3xl font-semibold tracking-tight text-slate-950">
                      {jobCount}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">Saved jobs</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    Open job opportunities
                    <ArrowRight
                      className="size-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </p>
                </Link>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 size-4.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Analysis is not available yet</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      The workspace will not display a compatibility score until the trusted
                      extraction, matching, and report phases are implemented.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section
              aria-labelledby="upcoming-heading"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
            >
              <h2
                id="upcoming-heading"
                className="text-lg font-semibold tracking-tight text-slate-950"
              >
                What comes next
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Phase 3 stores data only. These capabilities are not presented as available.
              </p>

              <ul className="mt-5 grid gap-4 md:grid-cols-2">
                {upcomingPhases.map((phase) => (
                  <li key={phase.title} className="rounded-xl border border-slate-200 p-4">
                    <StatusBadge tone="neutral">{phase.badge}</StatusBadge>
                    <h3 className="mt-3 text-sm font-semibold text-slate-900">{phase.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{phase.description}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-emerald-600" aria-hidden="true" />
                <p className="max-w-3xl text-xs leading-5 text-slate-600">
                  Route guards are not the security boundary. CVs, jobs, and requirements are
                  protected by Appwrite table and file permissions, with owner metadata checked in
                  the browser layer as defense in depth.
                </p>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section
              aria-labelledby="account-heading"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h2
                  id="account-heading"
                  className="text-lg font-semibold tracking-tight text-slate-950"
                >
                  Your account
                </h2>
                <StatusBadge tone="success">Signed in</StatusBadge>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-900 text-sm font-semibold text-white"
                  aria-hidden="true"
                >
                  {getInitials(displayName, user?.email)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{displayName}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>

              <dl className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-sm text-slate-500">Email status</dt>
                  <dd>
                    <StatusBadge tone={user?.emailVerification ? 'success' : 'warning'}>
                      {user?.emailVerification ? 'Verified' : 'Not verified'}
                    </StatusBadge>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-sm text-slate-500">Profile record</dt>
                  <dd className="text-sm font-medium text-slate-900">{profileStatus}</dd>
                </div>
              </dl>

              <Link
                to="/settings"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              >
                <UserRound className="size-4" aria-hidden="true" />
                Profile settings
              </Link>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <LockKeyhole className="size-4 text-slate-500" aria-hidden="true" />
                Privacy by default
              </h2>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
                <li>CV files are stored in a private bucket.</li>
                <li>Rows grant access only to the authenticated owner.</li>
                <li>No public file URL is created or displayed.</li>
                <li>No Gemini or AI processing happens in this phase.</li>
              </ul>
            </section>

            <Link
              to="/diagnostics"
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-2">
                <FileSearch className="size-4 text-slate-500" aria-hidden="true" />
                Run system check
              </span>
              <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />
            </Link>
          </aside>
        </div>
      </div>
    </div>
  )
}
