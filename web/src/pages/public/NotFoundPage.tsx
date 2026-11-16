import { ArrowLeft, ArrowRight, LayoutDashboard } from 'lucide-react'
import { ButtonLink } from '../../components/common/ButtonLink'
import { useAuth } from '../../hooks/use-auth'
import { usePageTitle } from '../../hooks/use-page-title'

export function NotFoundPage() {
  usePageTitle('Page not found')
  const { isAuthenticated } = useAuth()

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start px-4 py-20 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-widest text-brand-700 uppercase">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-600">
        The page you requested does not exist. Return to the public overview, open your workspace
        if you are signed in, or review the Appwrite system check.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to="/" variant="secondary">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to overview
        </ButtonLink>
        {isAuthenticated ? (
          <ButtonLink to="/dashboard">
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Open dashboard
          </ButtonLink>
        ) : null}
        <ButtonLink to="/diagnostics" variant="secondary">
          System check
          <ArrowRight className="size-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </div>
  )
}
