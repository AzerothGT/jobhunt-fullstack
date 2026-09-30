import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.jsx'
import { api } from '../../utils/api.js'

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api('/recruiter/dashboard', { signal: controller.signal }),
      api('/jobs/mine', { signal: controller.signal }),
    ])
      .then(([dashboard, mine]) => {
        setStats(dashboard)
        setJobs(mine.data ?? [])
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [retry])

  function retryLoad() {
    setLoading(true)
    setError('')
    setRetry((value) => value + 1)
  }

  return (
    <div className="page-shell dashboard-page">
      <header className="page-heading dashboard-heading">
        <div><span className="eyebrow">DASBOR RECRUITER</span><h1>Kerja yang <em>tumbuh.</em></h1><p>Kelola kesempatan dan temukan orang yang tepat.</p></div>
        <Link className="button" to="/jobs/create">Pasang lowongan <span aria-hidden="true">↗</span></Link>
      </header>
      {loading ? <LoadingState label="Memuat ringkasan rekrutmen…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={retryLoad} /> : null}
      {!loading && !error && stats && (
        <>
          <section className="stats-grid" aria-label="Ringkasan rekrutmen">
            <article className="stat-card"><span className="eyebrow">LOWONGAN ANDA</span><strong>{stats.total_jobs ?? 0}</strong><span>posisi dipublikasikan</span></article>
            <article className="stat-card stat-card-accent"><span className="eyebrow">TOTAL PELAMAR</span><strong>{stats.total_applicants ?? 0}</strong><span>kandidat telah menghubungi</span></article>
          </section>
          <section className="dashboard-jobs">
            <div className="section-heading"><div><span className="eyebrow">DAFTAR POSISI</span><h2>Lowongan Anda</h2></div><Link className="text-link" to="/jobs/create">Tambah posisi <span aria-hidden="true">↗</span></Link></div>
            {jobs.length === 0 ? <EmptyState title="Belum ada lowongan">Mulai dengan mempublikasikan posisi pertama Anda.</EmptyState> : (
              <div className="recruiter-job-list">
                {jobs.map((job) => (
                  <article className="recruiter-job-row" key={job.id}>
                    <div><span className="eyebrow">{job.is_active ? 'AKTIF' : 'DITUTUP'} · {job.location}</span><h3>{job.title}</h3><p>{job.company}</p></div>
                    <div className="recruiter-job-actions"><Link to={`/jobs/${job.id}/applicants`}>Lihat pelamar <span aria-hidden="true">↗</span></Link><Link to={`/jobs/${job.id}/edit`}>Edit</Link><Link to={`/jobs/${job.id}`}>Lihat</Link></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
