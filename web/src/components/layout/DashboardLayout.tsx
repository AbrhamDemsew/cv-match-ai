import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { getAuthErrorMessage } from '../../lib/auth-errors'
import { Brand } from '../layout/Brand'
import { SkipLink } from '../layout/SkipLink'
import { DashboardSidebar } from '../dashboard/DashboardSidebar'

export function DashboardLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

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

  async function handleLogout() {
    setLogoutError(null)

    try {
      await logout()
      navigate('/login', { replace: true, state: { signedOut: true } })
    } catch (error) {
      setLogoutError(getAuthErrorMessage(error))
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <SkipLink />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 lg:block">
        <DashboardSidebar
          onLogout={() => void handleLogout()}
          logoutError={logoutError}
        />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <Brand />
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="grid size-10 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950"
              aria-expanded={mobileOpen}
              aria-controls="dashboard-mobile-navigation"
              aria-label={mobileOpen ? 'Close workspace menu' : 'Open workspace menu'}
            >
              {mobileOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        {mobileOpen ? (
          <div
            id="dashboard-mobile-navigation"
            className="border-b border-slate-200 bg-white lg:hidden"
          >
            <div className="h-[calc(100dvh-4rem)] overflow-y-auto">
              <DashboardSidebar
                showBrand={false}
                onNavigate={() => setMobileOpen(false)}
                onLogout={() => void handleLogout()}
                logoutError={logoutError}
              />
            </div>
          </div>
        ) : null}

        <main
          id="dashboard-main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-6xl px-4 py-8 focus:outline-none sm:px-6 lg:px-8 lg:py-10"
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
