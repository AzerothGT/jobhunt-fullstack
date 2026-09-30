import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function SiteLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function signOut() {
    logout()
    navigate('/')
  }

  return (
    <>
      <header className="site-header">
        <Link className="wordmark" to="/" aria-label="JobHunt, beranda">
          <span className="wordmark-stamp" aria-hidden="true">JH</span>
          <span>job<span className="wordmark-slash">/</span>hunt</span>
        </Link>
        <nav className="primary-nav" aria-label="Navigasi utama">
          <NavLink to="/jobs">Lowongan</NavLink>
          {user?.role === 'job_seeker' && <NavLink to="/applications">Lamaran saya</NavLink>}
          {user?.role === 'recruiter' && <NavLink to="/dashboard">Dasbor recruiter</NavLink>}
        </nav>
        <div className="header-account">
          {user ? (
            <>
              <Link className="account-name" to="/profile">{user.name}</Link>
              <button className="quiet-button" type="button" onClick={signOut}>Keluar</button>
            </>
          ) : (
            <>
              <Link className="quiet-button" to="/login">Masuk</Link>
              <Link className="button button-small" to="/register">Daftar <span aria-hidden="true">↗</span></Link>
            </>
          )}
        </div>
      </header>
      <main className="site-main"><Outlet /></main>
      <footer className="site-footer">
        <Link className="footer-wordmark" to="/">job/hunt</Link>
        <p>Job Seeker menemukan kerja, Recruiter menemukan kandidat.</p>
        <span className="eyebrow">JOB BOARD · EST. 2025</span>
      </footer>
    </>
  )
}
