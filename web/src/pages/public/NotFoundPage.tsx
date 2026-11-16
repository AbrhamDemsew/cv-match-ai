import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ButtonLink } from '../../components/common/ButtonLink'
import { usePageTitle } from '../../hooks/use-page-title'

export function NotFoundPage() {
  usePageTitle('Page not found')

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-start px-4 py-20 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-widest text-brand-700 uppercase">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-600">
        The page you requested does not exist. Phase 1 only includes the overview and the system
        check; authentication and analysis pages arrive in later phases.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink to="/">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to overview
        </ButtonLink>
        <ButtonLink to="/diagnostics" variant="secondary">
          System check
          <ArrowRight className="size-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </div>
  )
}
