import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { getInitials } from '../../utils/user'
import { ButtonLink } from '../common/ButtonLink'
import { Brand } from './Brand'

const navigation = [
  { to: '/', label: 'Overview', end: true },
  { to: '/diagnostics', label: 'System check', end: false },
] as const

function navLinkClasses(isActive: boolean): string {
  return [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-800'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
  ].join(' ')
}

export function SiteHeader() {
  const { status, user, isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!mobileOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileOpen])

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => navLinkClasses(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {status === 'loading' ? (
            <div className="h-9 w-28 animate-pulse rounded-lg bg-slate-100" aria-hidden="true" />
          ) : isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 transition-colors hover:bg-brand-100"
            >
              <span
                className="grid size-7 place-items-center rounded-full bg-brand-900 text-[11px] font-semibold text-white"
                aria-hidden="true"
              >
                {getInitials(user?.name, user?.email)}
              </span>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                Sign in
              </Link>
              <ButtonLink to="/register" className="px-3.5 py-2">
                Create account
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="grid size-10 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {mobileOpen ? (
        <div id="mobile-navigation" className="border-t border-slate-200 bg-white md:hidden">
          <nav
            aria-label="Mobile navigation"
            className="mx-auto max-w-6xl space-y-1 px-4 py-4 sm:px-6"
          >
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `block ${navLinkClasses(isActive)}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mx-auto max-w-6xl space-y-2 border-t border-slate-100 px-4 py-4 sm:px-6">
            {status === 'loading' ? (
              <p className="text-sm text-slate-500">Checking your session…</p>
            ) : isAuthenticated ? (
              <ButtonLink to="/dashboard" className="w-full">
                Open dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="secondary" className="w-full">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/register" className="w-full">
                  Create account
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  )
}
