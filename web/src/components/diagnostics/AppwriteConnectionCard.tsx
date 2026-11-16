import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ServerCog,
  XCircle,
} from 'lucide-react'
import { useAppwriteHealth } from '../../hooks/use-appwrite-health'
import { environment } from '../../lib/env'
import type { AppwriteConnectionCheck } from '../../types/appwrite'
import { StatusBadge, type StatusTone } from '../common/StatusBadge'

interface ConnectionPresentation {
  tone: Extract<StatusTone, 'success' | 'warning' | 'danger'>
  badge: string
  title: string
  description: string
}

function presentConnection(result: AppwriteConnectionCheck): ConnectionPresentation {
  switch (result.status) {
    case 'connected':
      return {
        tone: 'success',
        badge: 'Connected',
        title: `Appwrite responded in ${result.latencyMs} ms`,
        description:
          'The endpoint was reached and it accepted the project header. This does not verify authentication, database tables, buckets, or functions.',
      }
    case 'project_not_found':
      return {
        tone: 'danger',
        badge: 'Project not found',
        title: 'The project ID was not recognized',
        description:
          'The endpoint responded, but the project does not exist there. Confirm the project ID in Appwrite Console → Settings and check that the endpoint belongs to the same region.',
      }
    case 'origin_rejected':
      return {
        tone: 'danger',
        badge: 'Origin rejected',
        title: 'This browser origin is not allowed',
        description:
          'Add the hostname shown in your browser address bar as a Web platform in Appwrite Console, then try again.',
      }
    case 'unreachable':
      return {
        tone: 'danger',
        badge: 'Unreachable',
        title: 'The Appwrite endpoint could not be reached',
        description: result.message,
      }
    case 'timeout':
      return {
        tone: 'warning',
        badge: 'Timed out',
        title: 'The connection check timed out',
        description: result.message,
      }
    case 'not_configured':
      return {
        tone: 'warning',
        badge: 'Not configured',
        title: 'Connection check paused',
        description: result.message,
      }
    case 'error':
      return {
        tone: 'danger',
        badge: 'Error',
        title: 'Appwrite returned an unexpected response',
        description: result.message,
      }
  }
}

const iconByTone = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const

export function AppwriteConnectionCard() {
  const connection = useAppwriteHealth()

  const isLoading = environment.isConfigured && connection.isPending

  const presentation = connection.data
    ? presentConnection(connection.data)
    : !environment.isConfigured
      ? presentConnection({
          status: 'not_configured',
          message: 'Add the required endpoint and project ID, then reload this page.',
        })
      : null

  const tone: Extract<StatusTone, 'success' | 'warning' | 'danger'> = connection.isError
    ? 'danger'
    : (presentation?.tone ?? 'warning')

  const Icon = isLoading ? Loader2 : connection.isError ? XCircle : iconByTone[tone]

  return (
    <section
      aria-labelledby="connection-heading"
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
          <ServerCog className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2
            id="connection-heading"
            className="text-lg font-semibold tracking-tight text-slate-950"
          >
            Appwrite connection
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            A public ping verifies that this browser can reach the configured Appwrite endpoint.
            It creates no session and reads no user data.
          </p>
        </div>
      </div>

      <div className="mt-6 flex-1" role="status" aria-live="polite">
        {isLoading ? (
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-slate-500" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-slate-900">Checking connection…</p>
              <p className="mt-1 text-sm text-slate-600">
                Contacting the configured Appwrite endpoint.
              </p>
            </div>
          </div>
        ) : connection.isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-rose-900">The check could not run</p>
              <p className="mt-1 text-sm leading-6 text-rose-700">
                An unexpected client error occurred. Reload the page and inspect the browser
                console if the problem continues.
              </p>
            </div>
          </div>
        ) : presentation ? (
          <div
            className={`rounded-xl border p-4 ${
              presentation.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50'
                : presentation.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-rose-200 bg-rose-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <Icon
                className={`mt-0.5 size-5 shrink-0 ${
                  presentation.tone === 'success'
                    ? 'text-emerald-600'
                    : presentation.tone === 'warning'
                      ? 'text-amber-600'
                      : 'text-rose-600'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{presentation.title}</p>
                  <StatusBadge tone={presentation.tone}>{presentation.badge}</StatusBadge>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {presentation.description}
                </p>
                {connection.data && 'code' in connection.data && connection.data.code ? (
                  <p className="mt-2 font-mono text-xs text-slate-500">
                    Appwrite code {connection.data.code}
                    {connection.data.type ? ` · ${connection.data.type}` : ''}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          {connection.dataUpdatedAt
            ? `Last checked at ${new Date(connection.dataUpdatedAt).toLocaleTimeString()}`
            : 'Not checked yet'}
        </p>
        <button
          type="button"
          onClick={() => void connection.refetch()}
          disabled={!environment.isConfigured || connection.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${connection.isFetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {connection.data ? 'Run again' : 'Run check'}
        </button>
      </div>
    </section>
  )
}
