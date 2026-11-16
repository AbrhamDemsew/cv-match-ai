import { Link } from 'react-router-dom'
import {
  APP_DESCRIPTION,
  APP_NAME,
  APPWRITE_DOCS_URL,
} from '../../lib/constants'
import { Brand } from './Brand'

const copyrightYear = new Date().getFullYear()

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <Brand />
            <p className="mt-3 text-sm leading-6 text-slate-600">{APP_DESCRIPTION}</p>
          </div>

          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              to="/diagnostics"
              className="font-medium text-slate-600 transition-colors hover:text-brand-700"
            >
              System check
            </Link>
            <a
              href={APPWRITE_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-slate-600 transition-colors hover:text-brand-700"
            >
              Appwrite docs
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {copyrightYear} {APP_NAME}
          </p>
          <p>Phase 2 · Authentication and dashboard enabled · CV analysis is not yet available.</p>
        </div>
      </div>
    </footer>
  )
}
