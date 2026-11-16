import { Route, Routes } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { DiagnosticsPage } from '../pages/public/DiagnosticsPage'
import { LandingPage } from '../pages/public/LandingPage'
import { NotFoundPage } from '../pages/public/NotFoundPage'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="diagnostics" element={<DiagnosticsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
