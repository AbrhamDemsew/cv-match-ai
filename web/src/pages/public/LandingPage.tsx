import {
  ArrowRight,
  BadgeCheck,
  FileSearch,
  LockKeyhole,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '../../components/common/ButtonLink'
import { StatusBadge } from '../../components/common/StatusBadge'
import { useAuth } from '../../hooks/use-auth'
import { usePageTitle } from '../../hooks/use-page-title'

const signals = [
  {
    title: 'CV–job compatibility',
    description: 'A weighted measure of evidence in your CV that aligns with this role.',
    icon: Target,
  },
  {
    title: 'Requirement coverage',
    description: 'How many stated job requirements have supporting evidence in your CV.',
    icon: BadgeCheck,
  },
  {
    title: 'ATS readiness',
    description:
      'Practical document-quality guidance — never a guarantee about a specific ATS.',
    icon: FileSearch,
  },
] as const

const principles = [
  {
    title: 'Evidence over keywords',
    description:
      'Requirements are classified with supporting CV evidence, not by counting repeated words.',
    icon: BadgeCheck,
  },
  {
    title: 'Explainable scoring',
    description:
      'Deterministic scoring and a visible breakdown explain how every result was produced.',
    icon: Target,
  },
  {
    title: 'Privacy-minded foundation',
    description:
      'The browser only receives public Appwrite configuration. Server credentials and the Gemini key stay server-side.',
    icon: LockKeyhole,
  },
] as const

const steps = [
  {
    title: 'Capture the role',
    description:
      'Add a CV and the job description, including required and preferred qualifications.',
  },
  {
    title: 'Examine the evidence',
    description:
      'Review each requirement as matched, partially matched, not demonstrated, or explicitly missing.',
  },
  {
    title: 'Improve honestly',
    description:
      'Get prioritized, job-specific recommendations without invented skills or experience.',
  },
] as const

export function LandingPage() {
  usePageTitle()
  const { isAuthenticated } = useAuth()

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <StatusBadge tone="info">Phase 2 · Accounts and dashboard</StatusBadge>

            <h1 className="mt-5 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-slate-950 text-balance sm:text-5xl lg:text-6xl">
              See how your CV matches the job — with evidence, not guesswork.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              CVMatch AI compares a CV against a specific role, explains which requirements are
              supported by evidence, and helps you improve your CV honestly. It never predicts
              whether you will be hired.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink to={isAuthenticated ? '/dashboard' : '/register'}>
                {isAuthenticated ? 'Open your dashboard' : 'Create your account'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <a
                href="#signals"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                See the planned signals
              </a>
            </div>

            {!isAuthenticated ? (
              <p className="mt-4 text-sm text-slate-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            ) : null}

            <p className="mt-6 flex max-w-xl items-start gap-2 text-sm leading-6 text-slate-500">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              Compatibility scores are never presented as the probability of getting hired.
            </p>
          </div>

          <aside
            aria-label="Planned analysis signals"
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm sm:p-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
                Separate signals
              </p>
              <StatusBadge tone="neutral">No hiring probability</StatusBadge>
            </div>

            <ul className="mt-5 divide-y divide-slate-200">
              {signals.map((signal) => (
                <li key={signal.title} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-brand-700 ring-1 ring-slate-200">
                    <signal.icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{signal.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{signal.description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-5 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">
              Scores describe evidence in a document. They do not know the applicant pool,
              interview performance, referrals, or an employer&apos;s internal criteria.
            </p>
          </aside>
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-brand-700 uppercase">
              Product principles
            </p>
            <h2
              id="principles-heading"
              className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 text-balance sm:text-3xl"
            >
              Designed to be useful, honest, and secure
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Visual polish never comes at the cost of accurate results, accessibility, or
              protection of your documents. These principles guide every phase.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {principles.map((principle) => (
              <article
                key={principle.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <principle.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-950">{principle.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{principle.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="signals"
        aria-labelledby="how-heading"
        className="scroll-mt-24 border-y border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold tracking-widest text-brand-700 uppercase">
                How it will work
              </p>
              <h2
                id="how-heading"
                className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 text-balance sm:text-3xl"
              >
                From a job description to an explainable result
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Accounts and session restoration are available now. The CV and analysis workflow
                is being built in later phases; this foundation does not invent sample results.
              </p>
            </div>

            <ol className="space-y-4">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-900 text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="meaning-heading" className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-brand-900 p-6 text-white shadow-sm sm:p-8 lg:p-10">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-100">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2
                  id="meaning-heading"
                  className="text-xl font-semibold tracking-tight text-white text-balance sm:text-2xl"
                >
                  What a compatibility score does — and does not — mean
                </h2>
                <div className="mt-4 grid gap-4 text-sm leading-6 text-brand-100 md:grid-cols-2">
                  <p>
                    A compatibility score measures how much evidence in your CV aligns with a
                    specific job description. It is useful for tailoring and spotting gaps.
                  </p>
                  <p>
                    It is not the probability of getting hired. CVMatch AI cannot see the
                    employer&apos;s applicant pool, interview decisions, referrals, or internal
                    hiring criteria.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                Phase status
              </h2>
              <ul className="mt-4 space-y-3">
                <li className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                  <StatusBadge tone="success">Available now</StatusBadge>
                  <span>Registration, sign-in, session restoration, protected dashboard</span>
                </li>
                <li className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                  <StatusBadge tone="info">Next phase</StatusBadge>
                  <span>Private CV storage, job records, and ownership permissions</span>
                </li>
                <li className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
                  <StatusBadge tone="neutral">Planned</StatusBadge>
                  <span>AI-assisted analysis, reports, and job comparison</span>
                </li>
              </ul>
            </div>

            <ButtonLink
              to={isAuthenticated ? '/dashboard' : '/register'}
              variant="secondary"
            >
              {isAuthenticated ? 'Open dashboard' : 'Create an account'}
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  )
}
