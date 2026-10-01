import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import SiteLayout from './components/SiteLayout.jsx'
import { LoadingState } from './components/PageState.jsx'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { useAuth } from './hooks/useAuth.js'
import ApplicationsPage from './pages/ApplicationsPage.jsx'
import ApplyWizardPage from './pages/ApplyWizardPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import HomePage from './pages/HomePage.jsx'
import JobDetailPage from './pages/JobDetailPage.jsx'
import JobsPage from './pages/JobsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import SavedJobsPage from './pages/SavedJobsPage.jsx'
import ApplicantsPage from './pages/recruiter/ApplicantsPage.jsx'
import DashboardPage from './pages/recruiter/DashboardPage.jsx'
import JobFormPage from './pages/recruiter/JobFormPage.jsx'

function Protected({ roles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingState label="Memeriksa sesi Anda…" />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/jobs" replace />
  return children
}

function NotFoundPage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Halaman tidak ditemukan · 404</EmptyTitle>
        <EmptyDescription>Sepertinya tersesat. Halaman ini belum menjadi bagian dari kami.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link to="/jobs" />}>Jelajahi lowongan</Button>
      </EmptyContent>
    </Empty>
  )
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
        <Route path="bookmarks" element={<Protected roles={['job_seeker']}><SavedJobsPage /></Protected>} />
        <Route path="jobs/:id/apply" element={<Protected roles={['job_seeker']}><ApplyWizardPage /></Protected>} />
        <Route path="dashboard" element={<Protected roles={['recruiter']}><DashboardPage /></Protected>} />
        <Route path="jobs/create" element={<Protected roles={['recruiter']}><JobFormPage mode="create" /></Protected>} />
        <Route path="jobs/:id/edit" element={<Protected roles={['recruiter']}><JobFormPage mode="edit" /></Protected>} />
        <Route path="jobs/:id/applicants" element={<Protected roles={['recruiter']}><ApplicantsPage /></Protected>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
