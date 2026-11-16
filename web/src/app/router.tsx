import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthLoadingScreen } from '../components/auth/AuthLoadingScreen'
import { AppShell } from '../components/layout/AppShell'
import { ProtectedRoute } from '../components/routing/ProtectedRoute'
import { PublicOnlyRoute } from '../components/routing/PublicOnlyRoute'
import { DiagnosticsPage } from '../pages/public/DiagnosticsPage'
import { LandingPage } from '../pages/public/LandingPage'
import { NotFoundPage } from '../pages/public/NotFoundPage'

const LoginPage = lazy(() =>
  import('../pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('../pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('../pages/auth/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import('../pages/auth/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
)
const DashboardLayout = lazy(() =>
  import('../components/layout/DashboardLayout').then((module) => ({
    default: module.DashboardLayout,
  })),
)
const DashboardPage = lazy(() =>
  import('../pages/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)

export function AppRouter() {
  return (
    <Suspense
      fallback={
        <AuthLoadingScreen title="Loading…" description="Preparing the next page." />
      }
    >
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
          </Route>
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
          </Route>
        </Route>

        <Route element={<AppShell />}>
          <Route index element={<LandingPage />} />
          <Route path="diagnostics" element={<DiagnosticsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
