import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { login, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries(form.entries())
    setError('')
    setSubmitting(true)
    try {
      const user = isRegister ? await register(values) : await login(values)
      const queryReturn = new URLSearchParams(location.search).get('returnTo')
      const stateReturn = location.state?.from?.pathname
      const returnTo = queryReturn || stateReturn
      const safeReturn = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null
      navigate(safeReturn || (user.role === 'recruiter' ? '/dashboard' : '/jobs'), { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell auth-page">
      <div className="auth-aside">
        <span className="eyebrow">{isRegister ? 'MULAI DI SINI' : 'SELAMAT DATANG KEMBALI'}</span>
        <p>{isRegister ? 'Satu langkah kecil menuju pekerjaan yang lebih berarti.' : 'Tempat yang baik untuk bekerja dimulai dengan pencarian yang baik.'}</p>
        <span className="auth-aside-mark" aria-hidden="true">J.</span>
      </div>
      <section className="auth-panel" aria-labelledby="auth-title">
        <span className="eyebrow">AKUN JOBHUNT</span>
        <h1 id="auth-title">{isRegister ? 'Buat akun.' : 'Masuk ke akun.'}</h1>
        <p className="auth-lead">{isRegister ? 'Pilih bagaimana Anda ingin menggunakan JobHunt.' : 'Lanjutkan perjalanan Anda dari sini.'}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <form className="form-stack" onSubmit={submit}>
          {isRegister && (
            <label htmlFor="name">Nama lengkap
              <input id="name" name="name" autoComplete="name" required maxLength="120" />
            </label>
          )}
          <label htmlFor="email">Email
            <input id="email" name="email" type="email" autoComplete="email" required />
          </label>
          <label htmlFor="password">Kata sandi
            <input id="password" name="password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={isRegister ? 8 : undefined} />
            {isRegister && <span className="field-hint">Gunakan minimal 8 karakter.</span>}
          </label>
          {isRegister && (
            <label htmlFor="role">Saya ingin
              <select id="role" name="role" defaultValue="job_seeker" required>
                <option value="job_seeker">Mencari pekerjaan</option>
                <option value="recruiter">Merekrut kandidat</option>
              </select>
            </label>
          )}
          <button className="button button-full" type="submit" disabled={submitting}>{submitting ? 'Mohon tunggu…' : isRegister ? 'Buat akun' : 'Masuk'} <span aria-hidden="true">↗</span></button>
        </form>
        <p className="auth-switch">{isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Masuk' : 'Daftar sekarang'}</Link></p>
      </section>
    </div>
  )
}
