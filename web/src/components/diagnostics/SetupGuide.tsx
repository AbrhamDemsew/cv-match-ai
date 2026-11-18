import { ExternalLink, Terminal } from 'lucide-react'
import {
  APPWRITE_CONSOLE_URL,
  APPWRITE_ENDPOINT_EXAMPLE,
  APPWRITE_WEB_QUICK_START_URL,
  LOCAL_WEB_PLATFORM_HOST,
} from '../../lib/constants'

export function SetupGuide() {
  const currentHostname =
    typeof window !== 'undefined' ? window.location.hostname : LOCAL_WEB_PLATFORM_HOST

  return (
    <section
      aria-labelledby="setup-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
          <Terminal className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="setup-heading" className="text-lg font-semibold tracking-tight text-slate-950">
            Connect your Appwrite project
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            The app can render without configuration, but the connection check needs a valid
            endpoint and project ID. CV and job pages also need a database and private resumes
            bucket.
          </p>
        </div>
      </div>

      <ol className="mt-6 space-y-5">
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            1
          </span>
          <div className="min-w-0 text-sm leading-6 text-slate-600">
            <p>
              Create or open a project in the{' '}
              <a
                href={APPWRITE_CONSOLE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                Appwrite Console
                <ExternalLink className="size-3.5" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              . Add a <strong className="font-medium text-slate-800">Web platform</strong> for{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
                {currentHostname}
              </code>
              . Enter only the hostname, without a port.
            </p>
          </div>
        </li>

        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            2
          </span>
          <div className="min-w-0 text-sm leading-6 text-slate-600">
            <p>From the repository root, open the web app and create your local environment file:</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              <code>{'cd web\ncp .env.example .env.local'}</code>
            </pre>
          </div>
        </li>

        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            3
          </span>
          <div className="min-w-0 text-sm leading-6 text-slate-600">
            <p>
              Set the endpoint and project ID from Appwrite Console → Settings, then add the Phase
              3 database and private resumes bucket IDs after creating them with the repository
              setup guide:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              <code>
                {`VITE_APPWRITE_ENDPOINT=${APPWRITE_ENDPOINT_EXAMPLE}\nVITE_APPWRITE_PROJECT_ID=<APPWRITE_PROJECT_ID>\nVITE_APPWRITE_DATABASE_ID=<DATABASE_ID>\nVITE_APPWRITE_RESUMES_BUCKET_ID=<RESUMES_BUCKET_ID>`}
              </code>
            </pre>
            <p className="mt-2 text-xs text-slate-500">
              Reports bucket and analysis Function IDs can stay unset until those phases begin.
              Follow <code>docs/appwrite-setup.md</code> and <code>docs/data-model.md</code> for the
              required tables, indexes, row permissions, and bucket settings.
            </p>
          </div>
        </li>

        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
            4
          </span>
          <div className="min-w-0 text-sm leading-6 text-slate-600">
            <p>
              Restart the dev server with{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
                npm run dev
              </code>{' '}
              and run the check again. Vite reads environment files at startup.
            </p>
          </div>
        </li>
      </ol>

      <a
        href={APPWRITE_WEB_QUICK_START_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
      >
        Read the Appwrite Web quick start
        <ExternalLink className="size-3.5" aria-hidden="true" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </section>
  )
}
