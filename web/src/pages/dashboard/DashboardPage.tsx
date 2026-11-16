import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { ButtonLink } from '../../components/common/ButtonLink'
import { PageHeader } from '../../components/common/PageHeader'
import { StatusBadge } from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/use-auth'
import { usePageTitle } from '../../hooks/use-page-title'

const upcomingPhases = [
  {
    title: 'CV and job records',
    description: 'Upload private CVs and save job descriptions with ownership permissions.',
    badge: 'Next phase',
    tone: 'info' as const,
  },
  {
    title: 'PDF extraction and AI analysis',
    description: 'Extract evidence and compare it with each job requirement in a trusted Function.',
    badge: 'Planned',
    tone: 'neutral' as const,
  },
  {
    title: 'Results and reports',
    description: 'Review explainable scores, recommendations, and downloadable PDF reports.',
    badge: 'Planned',
    tone: 'neutral' as const,
  },
] as const

export function DashboardPage() {
  usePageTitle('Dashboard')

  const { user } = useAuth()
  const firstName =
    user?.name.trim().split(/\s+/)[0] || user?.email.split('@')[0] || 'there'

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${firstName}.`}
        description="Your account and session are ready. CV uploads, job records, and AI-assisted analysis arrive in the next phases."
        actions={
          <ButtonLink to="/diagnostics" variant="secondary">
            Run system check
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section
          aria-labelledby="account-heading"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
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

          <dl className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-sm text-slate-500">Name</dt>
              <dd className="text-sm font-medium text-slate-900">
                {user?.name.trim() || 'Not provided'}
              </dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-sm text-slate-500">Email</dt>
              <dd className="text-sm font-medium break-all text-slate-900">{user?.email}</dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-sm text-slate-500">Email status</dt>
              <dd>
                <StatusBadge tone={user?.emailVerification ? 'success' : 'warning'}>
                  {user?.emailVerification ? 'Verified' : 'Not verified'}
                </StatusBadge>
              </dd>
            </div>
            <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <dt className="text-sm text-slate-500">Session</dt>
              <dd className="text-sm font-medium text-slate-900">
                Managed by Appwrite Auth
              </dd>
            </div>
          </dl>

          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            This profile is read directly from your Appwrite account. Persistent profile rows and
            editable account settings belong to later phases.
          </p>
        </section>

        <section
          aria-labelledby="workspace-heading"
          className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
        >
          <h2
            id="workspace-heading"
            className="text-lg font-semibold tracking-tight text-slate-950"
          >
            Analysis workspace
          </h2>
          <div className="mt-5 flex flex-1 flex-col items-start justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5">
            <span className="grid size-11 place-items-center rounded-xl bg-white text-brand-700 ring-1 ring-slate-200">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-900">No workspace data yet</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Phase 2 intentionally does not create CVs, jobs, or analyses. This page will not
              display fabricated counts or results.
            </p>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            The next data phase adds private CV storage, job records, and ownership permissions.
          </p>
        </section>
      </div>

      <section
        aria-labelledby="upcoming-heading"
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
      >
        <h2 id="upcoming-heading" className="text-lg font-semibold tracking-tight text-slate-950">
          What comes next
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          The product is being delivered in reviewed phases. No feature below is presented as
          available yet.
        </p>

        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {upcomingPhases.map((phase) => (
            <li key={phase.title} className="rounded-xl border border-slate-200 p-4">
              <StatusBadge tone={phase.tone}>{phase.badge}</StatusBadge>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{phase.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{phase.description}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <p className="max-w-3xl text-xs leading-5 text-slate-600">
            Route guards only improve navigation. They are not the security boundary. Every CV,
            job, analysis, and report must also be protected by Appwrite row/file permissions and
            server-side ownership checks in the Functions that process them.
          </p>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <FileText className="size-4.5 shrink-0 text-slate-400" aria-hidden="true" />
          CV library — planned for the data phase
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <BriefcaseBusiness className="size-4.5 shrink-0 text-slate-400" aria-hidden="true" />
          Job opportunities — planned for the data phase
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <LockKeyhole className="size-3.5" aria-hidden="true" />
        No passwords or session tokens are stored manually by this application.
      </p>
    </div>
  )
}
