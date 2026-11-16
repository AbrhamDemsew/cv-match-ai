import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../common/Button'
import { ButtonLink } from '../common/ButtonLink'
import { Brand } from '../layout/Brand'

interface AuthSessionErrorProps {
  message: string
  onRetry: () => Promise<void>
}

export function AuthSessionError({ message, onRetry }: AuthSessionErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  async function handleRetry() {
    setIsRetrying(true)
    try {
      await onRetry()
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <Brand />
        </div>
      </header>

      <main className="grid flex-1 place-items-center px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
          <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
            We could not verify your session
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600" role="alert">
            {message}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your account has not been changed. Retry the check, or review the Appwrite
            configuration before signing in again.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => void handleRetry()} isLoading={isRetrying}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Retry session check
            </Button>
            <ButtonLink to="/diagnostics" variant="secondary">
              System check
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  )
}
