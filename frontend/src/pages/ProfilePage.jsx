import { useAuth } from '../hooks/useAuth.js'

export default function ProfilePage() {
  const { user } = useAuth()
  const role = user.role === 'recruiter' ? 'Perekrut' : 'Pencari kerja'
  const initial = user.name?.trim()?.charAt(0)?.toLocaleUpperCase('id-ID') || 'R'

  return (
    <div className="page-shell profile-page">
      <header className="page-heading">
        <span className="eyebrow">AKUN ANDA</span>
        <h1>Profil <em>pribadi.</em></h1>
        <p>Informasi dasar yang terhubung dengan akun Ruang Kerja Anda.</p>
      </header>
      <section className="profile-card" aria-labelledby="profile-name">
        <div className="profile-avatar" aria-hidden="true">{initial}</div>
        <div className="profile-details">
          <span className="eyebrow">{role.toUpperCase()}</span>
          <h2 id="profile-name">{user.name}</h2>
          <p>{user.email}</p>
        </div>
        <span className="profile-mark" aria-hidden="true">RK</span>
      </section>
    </div>
  )
}
