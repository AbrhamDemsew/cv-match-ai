import { FileSearch } from 'lucide-react'
import { Link } from 'react-router-dom'
import { APP_NAME } from '../../lib/constants'

interface BrandProps {
  className?: string
}

export function Brand({ className = '' }: BrandProps) {
  return (
    <Link
      to="/"
      aria-label={`${APP_NAME} home`}
      className={`inline-flex items-center gap-2.5 rounded-lg ${className}`}
    >
      <span className="grid size-9 place-items-center rounded-xl bg-brand-900 text-white shadow-sm">
        <FileSearch className="size-5" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-tight text-slate-950">
        CVMatch <span className="text-brand-600">AI</span>
      </span>
    </Link>
  )
}
