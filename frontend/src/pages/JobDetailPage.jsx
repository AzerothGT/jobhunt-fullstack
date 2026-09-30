import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx'
import { useApplications } from '../hooks/useApplications.js'
import { useAuth } from '../hooks/useAuth.js'
import { api } from '../utils/api.js'
import { formatDate, formatSalary, jobTypeLabel } from '../utils/format.js'

export default function JobDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { apply } = useApplications()
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [loadedKey, setLoadedKey] = useState(null)
  const requestKey = `${id}:${retry}`
  const loading = loadedKey !== requestKey
  const [coverLetter, setCoverLetter] = useState('')
  const [applying, setApplying] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api(`/jobs/${id}`, { signal: controller.signal })
      .then(({ job: result }) => {
        if (controller.signal.aborted) return
        setJob(result ?? null)
        setError('')
        setLoadedKey(requestKey)
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError.message)
          setLoadedKey(requestKey)
        }
      })
    return () => controller.abort()
  }, [id, retry, requestKey])

  async function submitApplication(event) {
    event.preventDefault()
    if (!user) {
      navigate(`/login?returnTo=${encodeURIComponent(`/jobs/${id}`)}`)
      return
    }
    if (user.role !== 'job_seeker' || !job?.is_active) return
    setApplying(true)
    setApplyError('')
    try {
      await apply(id, coverLetter)
      setApplied(true)
    } catch (requestError) {
      setApplyError(requestError.message)
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <div className="page-shell"><LoadingState label="Memuat detail lowongan…" /></div>
  if (error) return <div className="page-shell"><ErrorState message={error} onRetry={() => setRetry((value) => value + 1)} /></div>
  if (!job) return <div className="page-shell"><EmptyState title="Lowongan tidak ditemukan"><Link to="/jobs">Kembali ke daftar lowongan</Link></EmptyState></div>

  const salary = [formatSalary(job.salary_min), formatSalary(job.salary_max)].filter(Boolean)
  const salaryText = salary.length === 2 ? `${salary[0]} — ${salary[1]}` : salary[0]
  const requirements = Array.isArray(job.requirements) ? job.requirements : null

  return (
    <div className="page-shell detail-page">
      <Link className="back-link" to="/jobs">← Kembali ke lowongan</Link>
      <article className="detail-layout">
        <div className="detail-main">
          <header className="detail-heading">
            <div className="detail-tags"><span className="job-type">{jobTypeLabel(job.type)}</span><span className={job.is_active ? 'status-pill status-open' : 'status-pill'}>{job.is_active ? 'Menerima lamaran' : 'Lowongan ditutup'}</span></div>
            <span className="eyebrow">{job.company} · DIPUBLIKASIKAN {formatDate(job.created_at)}</span>
            <h1>{job.title}</h1>
            <p className="detail-location">{job.location}</p>
          </header>
          <section className="prose-section">
            <span className="eyebrow">TENTANG PEKERJAAN</span>
            <div className="prose-copy">{job.description}</div>
          </section>
          {job.requirements && (
            <section className="prose-section">
              <span className="eyebrow">KUALIFIKASI</span>
              {requirements ? <ul className="requirements-list">{requirements.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <div className="prose-copy">{job.requirements}</div>}
            </section>
          )}
        </div>
        <aside className="apply-card" aria-labelledby="apply-title">
          <span className="eyebrow">RINGKASAN</span>
          <h2 id="apply-title">{job.company}</h2>
          <dl className="job-facts">
            <div><dt>Lokasi</dt><dd>{job.location}</dd></div>
            <div><dt>Jenis</dt><dd>{jobTypeLabel(job.type)}</dd></div>
            <div><dt>Kisaran gaji</dt><dd>{salaryText || 'Dibicarakan saat wawancara'}</dd></div>
          </dl>
          {applied ? (
            <div className="success-note" role="status"><span aria-hidden="true">✓</span> Lamaran Anda sudah terkirim.</div>
          ) : user?.role === 'recruiter' ? (
            <p className="form-note">Akun rekruter tidak dapat mengirim lamaran.</p>
          ) : (
            <form className="apply-form" onSubmit={submitApplication}>
              {applyError && <p className="form-error" role="alert">{applyError}</p>}
              {!job.is_active && <p className="form-note">Lowongan ini sudah tidak menerima lamaran.</p>}
              {job.is_active && (
                <>
                  <label htmlFor="cover-letter">Pesan pengantar <span>(opsional)</span></label>
                  <textarea id="cover-letter" rows="5" value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} placeholder="Ceritakan singkat mengapa pekerjaan ini menarik bagi Anda." />
                  <button className="button button-full" type="submit" disabled={applying}>{applying ? 'Mengirim…' : user ? 'Kirim lamaran' : 'Masuk untuk melamar'} <span aria-hidden="true">↗</span></button>
                </>
              )}
            </form>
          )}
          <p className="apply-footnote">Pastikan profil Anda siap sebelum mengirim lamaran.</p>
        </aside>
      </article>
    </div>
  )
}
