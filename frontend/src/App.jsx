import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import { LoadingState } from './components/PageState.jsx'
import { useAuth } from './hooks/useAuth.js'
import ApplicationsPage from './pages/ApplicationsPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import HomePage from './pages/HomePage.jsx'
import JobDetailPage from './pages/JobDetailPage.jsx'
import JobsPage from './pages/JobsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ApplicantsPage from './pages/recruiter/ApplicantsPage.jsx'
import DashboardPage from './pages/recruiter/DashboardPage.jsx'
import JobFormPage from './pages/recruiter/JobFormPage.jsx'
import './App.css'

function Protected({ roles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingState label="Memeriksa sesi Anda…" />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/jobs" replace />
  return children
}

function NotFoundPage() {
  return <section className="page-shell not-found"><span className="eyebrow">HALAMAN TIDAK DITEMUKAN · 404</span><h1>Sepertinya tersesat.</h1><p>Halaman ini belum menjadi bagian dari jurnal kami.</p><Link className="button" to="/jobs">Jelajahi lowongan <span aria-hidden="true">↗</span></Link></section>
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="login" element={<AuthPage mode="login" />} />
        <Route path="register" element={<AuthPage mode="register" />} />
        <Route path="profile" element={<Protected><ProfilePage /></Protected>} />
        <Route path="applications" element={<Protected roles={['job_seeker']}><ApplicationsPage /></Protected>} />
        <Route path="dashboard" element={<Protected roles={['recruiter']}><DashboardPage /></Protected>} />
        <Route path="jobs/create" element={<Protected roles={['recruiter']}><JobFormPage mode="create" /></Protected>} />
        <Route path="jobs/:id/edit" element={<Protected roles={['recruiter']}><JobFormPage mode="edit" /></Protected>} />
        <Route path="jobs/:id/applicants" element={<Protected roles={['recruiter']}><ApplicantsPage /></Protected>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
