import {
  BarChart3,
  BriefcaseBusiness,
  FileSearch,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  ServerCog,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { getInitials } from '../../utils/user'
import { Button } from '../common/Button'
import { StatusBadge } from '../common/StatusBadge'
import { Brand } from '../layout/Brand'

const primaryNavigation = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/diagnostics', label: 'System check', icon: ServerCog, end: false },
] as const

const plannedNavigation = [
  { label: 'CV library', icon: FileText },
  { label: 'Job opportunities', icon: BriefcaseBusiness },
  { label: 'Analysis results', icon: BarChart3 },
  { label: 'Reports', icon: FileSearch },
] as const

interface DashboardSidebarProps {
  showBrand?: boolean
  onNavigate?: () => void
  onLogout: () => void
  logoutError: string | null
}

export function DashboardSidebar({
  showBrand = true,
  onNavigate,
  onLogout,
  logoutError,
}: DashboardSidebarProps) {
  const { user, isLoggingOut } = useAuth()
  const displayName = user?.name.trim() || user?.email || 'Your account'

  return (
    <div className="flex h-full flex-col bg-white">
      {showBrand ? (
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-5">
          <Brand />
        </div>
      ) : null}

      <nav aria-label="Workspace navigation" className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 text-xs font-semibold tracking-widest text-slate-400 uppercase">
          Workspace
        </p>
        <div className="mt-2 space-y-1">
          {primaryNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`
              }
            >
              <item.icon className="size-4.5" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <LockKeyhole className="size-3.5 text-slate-400" aria-hidden="true" />
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Coming later
            </p>
          </div>
          <ul className="mt-3 space-y-2.5">
            {plannedNavigation.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 text-sm text-slate-500">
                <item.icon className="size-4 text-slate-400" aria-hidden="true" />
                {item.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            These tools appear when the data and analysis phases are implemented.
          </p>
        </div>
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-900 text-sm font-semibold text-white"
              aria-hidden="true"
            >
              {getInitials(user?.name, user?.email)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge tone={user?.emailVerification ? 'success' : 'warning'}>
              {user?.emailVerification ? 'Email verified' : 'Email unverified'}
            </StatusBadge>
            <span className="text-xs text-slate-500">Appwrite session</span>
          </div>
        </div>

        {logoutError ? (
          <p className="mt-3 text-xs leading-5 text-rose-600" role="alert">
            {logoutError}
          </p>
        ) : null}

        <Button
          variant="secondary"
          fullWidth
          isLoading={isLoggingOut}
          onClick={onLogout}
          className="mt-3"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
