import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '../../components/common/PageHeader'
import { AppwriteConnectionCard } from '../../components/diagnostics/AppwriteConnectionCard'
import { PublicConfigCard } from '../../components/diagnostics/PublicConfigCard'
import { SecurityNotes } from '../../components/diagnostics/SecurityNotes'
import { SetupGuide } from '../../components/diagnostics/SetupGuide'
import { usePageTitle } from '../../hooks/use-page-title'
import { environment } from '../../lib/env'

export function DiagnosticsPage() {
  usePageTitle('System check')

  const hasConfigurationErrors = environment.issues.some((issue) => issue.severity === 'error')

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <PageHeader
        eyebrow="Diagnostics"
        title="System check"
        description="Inspect the public Appwrite settings loaded by the app and verify that this browser can reach your Appwrite project. No API keys, sessions, or personal data are involved."
      />

      <div
        className={`mt-8 flex items-start gap-3 rounded-xl border p-4 sm:p-5 ${
          hasConfigurationErrors
            ? 'border-amber-200 bg-amber-50'
            : 'border-emerald-200 bg-emerald-50'
        }`}
        role="status"
      >
        {hasConfigurationErrors ? (
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
        )}
        <div>
          <p className="text-sm font-medium text-slate-900">
            {hasConfigurationErrors
              ? 'Required configuration is incomplete'
              : 'Required configuration detected'}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            {hasConfigurationErrors
              ? 'Follow the setup guide below, then restart the dev server. The connection check stays disabled until both required values are valid.'
              : 'The endpoint and project ID are present and structurally valid. A connection check runs automatically when this page loads.'}
          </p>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <PublicConfigCard />
        <AppwriteConnectionCard />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <SetupGuide />
        <SecurityNotes />
      </div>
    </div>
  )
}
