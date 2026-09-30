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
        <Link className="wordmark" to="/" aria-label="Ruang Kerja, beranda">
          <span className="wordmark-stamp" aria-hidden="true">RK</span>
          <span>ruang<span className="wordmark-slash">/</span>kerja</span>
        </Link>
        <nav className="primary-nav" aria-label="Navigasi utama">
          <NavLink to="/jobs">Lowongan</NavLink>
          {user?.role === 'job_seeker' && <NavLink to="/applications">Lamaran saya</NavLink>}
          {user?.role === 'recruiter' && <NavLink to="/dashboard">Ruang rekrutmen</NavLink>}
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
        <Link className="footer-wordmark" to="/">ruang/kerja</Link>
        <p>Temukan pekerjaan yang memberi ruang untuk bertumbuh.</p>
        <span className="eyebrow">JURNAL PEKERJAAN · EST. 2025</span>
      </footer>
    </>
  )
}
