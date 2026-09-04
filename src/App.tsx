import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { DashboardV2 } from './pages/DashboardV2'
import { AdminVessels } from './pages/AdminVessels'
import { AdminMarinas } from './pages/AdminMarinas'
import { Account } from './pages/Account'
import { MagicLink } from './pages/MagicLink'
import { ErrorBoundary } from './components/ErrorBoundary'
// import { HomeRedirect } from './components/ProtectedRoute'

function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Routes>
        <Route path="/" element={<DashboardV2 />} />
        <Route path="/rainmaker00" element={<Login />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<DashboardV2 />} />
        <Route path="/briefing-v2" element={<Navigate to="/dashboard" replace />} />
        <Route path="/subscribe" element={<Navigate to="/" replace />} />
        <Route path="/subscribe/success" element={<Navigate to="/dashboard" replace />} />
        <Route path="/account" element={<Account />} />
        <Route path="/magic" element={<MagicLink />} />
        <Route path="/admin/vessels" element={<AdminVessels />} />
        <Route path="/manage/marinalistings" element={<AdminMarinas />} />
        <Route path="/dashboard/admin" element={<Navigate to="/manage/marinalistings" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
