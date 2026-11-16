import { SlidersHorizontal } from 'lucide-react'
import { ENV_KEYS, environment, type EnvironmentIssue, type PublicEnvKey } from '../../lib/env'
import { StatusBadge, type StatusTone } from '../common/StatusBadge'

interface ConfigRowData {
  label: string
  variable: PublicEnvKey
  value: string | null
  requiredNow: boolean
  note?: string
}

function rowStatus(
  row: ConfigRowData,
  issue: EnvironmentIssue | undefined,
): { label: string; tone: StatusTone } {
  if (issue?.severity === 'warning') {
    return { label: 'Check', tone: 'warning' }
  }

  if (row.value) {
    return { label: row.requiredNow ? 'Ready' : 'Set', tone: 'success' }
  }

  return row.requiredNow
    ? { label: 'Missing', tone: 'danger' }
    : { label: 'Not set', tone: 'neutral' }
}

export function PublicConfigCard() {
  const rows: ConfigRowData[] = [
    {
      label: 'API endpoint',
      variable: ENV_KEYS.endpoint,
      value: environment.endpoint,
      requiredNow: true,
    },
    {
      label: 'Project ID',
      variable: ENV_KEYS.projectId,
      value: environment.projectId,
      requiredNow: true,
    },
    {
      label: 'Database ID',
      variable: ENV_KEYS.databaseId,
      value: environment.databaseId,
      requiredNow: false,
      note: 'Used in the database phase.',
    },
    {
      label: 'Resumes bucket ID',
      variable: ENV_KEYS.resumesBucketId,
      value: environment.resumesBucketId,
      requiredNow: false,
      note: 'Used in the file storage phase.',
    },
    {
      label: 'Reports bucket ID',
      variable: ENV_KEYS.reportsBucketId,
      value: environment.reportsBucketId,
      requiredNow: false,
      note: 'Used in the report phase.',
    },
    {
      label: 'Analyze function ID',
      variable: ENV_KEYS.analyzeFunctionId,
      value: environment.analyzeFunctionId,
      requiredNow: false,
      note: 'Used in the analysis phase.',
    },
  ]

  return (
    <section
      aria-labelledby="public-config-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
          <SlidersHorizontal className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="public-config-heading"
            className="text-lg font-semibold tracking-tight text-slate-950"
          >
            Public configuration
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            These values come from Vite environment variables and are safe to expose. Required
            values must be valid before a connection check can run.
          </p>
        </div>
      </div>

      <dl className="mt-6 divide-y divide-slate-100 border-t border-slate-100">
        {rows.map((row) => {
          const issue = environment.issues.find((item) => item.variable === row.variable)
          const status = rowStatus(row, issue)

          return (
            <div key={row.variable} className="py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <dt className="text-sm font-medium text-slate-900">
                    {row.label}
                    {!row.requiredNow ? (
                      <span className="ml-2 text-xs font-normal text-slate-500">later phase</span>
                    ) : null}
                  </dt>
                  <dd className="mt-0.5 font-mono text-xs break-all text-slate-500">
                    {row.variable}
                  </dd>
                  {row.note ? <p className="mt-1 text-xs text-slate-500">{row.note}</p> : null}
                </div>

                <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                  <dd className="max-w-full font-mono text-xs break-all text-slate-700">
                    {row.value ?? <span className="font-sans text-slate-400">Not set</span>}
                  </dd>
                  <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                </div>
              </div>

              {issue ? (
                <p
                  className={`mt-2 text-xs leading-5 ${
                    issue.severity === 'error' ? 'text-rose-700' : 'text-amber-700'
                  }`}
                >
                  {issue.message}
                </p>
              ) : null}
            </div>
          )
        })}
      </dl>

      <p className="mt-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
        Vite mode: <code className="font-mono text-slate-700">{import.meta.env.MODE}</code>. Vite
        embeds environment values when the dev server starts or the production bundle is built, so
        restart the server after changing <code className="font-mono">.env.local</code>.
      </p>
    </section>
  )
}
