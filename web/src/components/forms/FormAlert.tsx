import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { ReactNode } from 'react'

const toneConfig = {
  error: {
    icon: AlertCircle,
    classes: 'border-rose-200 bg-rose-50 text-rose-800',
    iconClasses: 'text-rose-600',
    role: 'alert' as const,
  },
  success: {
    icon: CheckCircle2,
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconClasses: 'text-emerald-600',
    role: 'status' as const,
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-amber-200 bg-amber-50 text-amber-900',
    iconClasses: 'text-amber-600',
    role: 'status' as const,
  },
  info: {
    icon: Info,
    classes: 'border-brand-200 bg-brand-50 text-brand-900',
    iconClasses: 'text-brand-600',
    role: 'status' as const,
  },
} as const

type FormAlertTone = keyof typeof toneConfig

interface FormAlertProps {
  tone?: FormAlertTone
  title?: string
  children: ReactNode
}

export function FormAlert({ tone = 'error', title, children }: FormAlertProps) {
  const config = toneConfig[tone]
  const Icon = config.icon

  return (
    <div
      role={config.role}
      className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm leading-6 ${config.classes}`}
    >
      <Icon className={`mt-0.5 size-4.5 shrink-0 ${config.iconClasses}`} aria-hidden="true" />
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
    </div>
  )
}
