import { useId, type ReactNode } from 'react'

interface AuthCardProps {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h1
        id={titleId}
        className="text-2xl font-semibold tracking-tight text-slate-950 text-balance"
      >
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-6">{children}</div>

      {footer ? <div className="mt-6 border-t border-slate-100 pt-5">{footer}</div> : null}
    </section>
  )
}
