import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/use-auth'
import { AuthLoadingScreen } from '../auth/AuthLoadingScreen'

export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <AuthLoadingScreen />
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
