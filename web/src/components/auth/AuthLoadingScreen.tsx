import { Loader2 } from 'lucide-react'
import { Brand } from '../layout/Brand'

interface AuthLoadingScreenProps {
  title?: string
  description?: string
}

export function AuthLoadingScreen({
  title = 'Checking your session…',
  description = 'This only takes a moment.',
}: AuthLoadingScreenProps) {
  return (
    <div className="grid min-h-dvh place-items-center bg-slate-50 px-4">
      <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
        <Brand />
        <Loader2 className="mt-8 size-7 animate-spin text-brand-600" aria-hidden="true" />
        <p className="mt-4 text-sm font-medium text-slate-700">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  )
}

