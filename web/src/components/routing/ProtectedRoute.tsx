import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { AuthLoadingScreen } from '../auth/AuthLoadingScreen'
import { AuthSessionError } from '../auth/AuthSessionError'

export function ProtectedRoute() {
  const { status, error, refreshSession } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return <AuthLoadingScreen />
  }

  if (status === 'error') {
    return (
      <AuthSessionError
        message={error ?? 'The authentication service could not be reached.'}
        onRetry={refreshSession}
      />
    )
  }

  if (status === 'unauthenticated') {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}
