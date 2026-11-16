import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const variantClasses = {
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 focus-visible:outline-brand-700',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-brand-700',
} as const

interface ButtonLinkProps {
  to: string
  variant?: keyof typeof variantClasses
  className?: string
  children: ReactNode
}

export function ButtonLink({
  to,
  variant = 'primary',
  className = '',
  children,
}: ButtonLinkProps) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${variantClasses[variant]} ${className}`}
    >
      {children}
    </Link>
  )
}
