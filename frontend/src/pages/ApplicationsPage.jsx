import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx'
import { useApplications } from '../hooks/useApplications.js'
import { formatDate, jobTypeLabel } from '../utils/format.js'

const statusLabels = { pending: 'Menunggu', reviewed: 'Ditinjau', rejected: 'Tidak terpilih' }

export default function ApplicationsPage() {
  const { applications, loading, error, refresh } = useApplications('mine')

  return (
    <div className="page-shell applications-page">
      <header className="page-heading">
        <span className="eyebrow">CATATAN PERJALANAN</span>
        <h1>Lamaran <em>saya.</em></h1>
        <p>Semua langkah yang sudah Anda ambil, tersusun di satu tempat.</p>
      </header>
      {loading ? <LoadingState label="Memuat riwayat lamaran…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {!loading && !error && applications.length === 0 ? <EmptyState title="Belum ada lamaran">Lowongan yang Anda lamar akan muncul di sini. <Link to="/jobs">Jelajahi lowongan</Link></EmptyState> : null}
      {!loading && !error && applications.length > 0 && (
        <div className="application-list">
          {applications.map((application) => {
            const job = application.job ?? {}
            const jobId = job.id ?? application.job_id
            return (
              <article className="application-row" key={application.id}>
                <div className="application-date"><span className="eyebrow">DIKIRIM</span><time>{formatDate(application.applied_at ?? application.created_at)}</time></div>
                <div className="application-role">
                  <span className="job-type">{jobTypeLabel(job.type)}</span>
                  <h2>{jobId ? <Link to={`/jobs/${jobId}`}>{job.title ?? application.job_title ?? 'Lowongan'}</Link> : (job.title ?? application.job_title ?? 'Lowongan')}</h2>
                  <p>{job.company ?? application.job_company ?? 'Perusahaan'}{job.location ? ` · ${job.location}` : ''}</p>
                  {application.cover_letter && <details className="cover-letter"><summary>Lihat pesan pengantar</summary><p>{application.cover_letter}</p></details>}
                </div>
                <span className={`application-status status-${application.status}`}>{statusLabels[application.status] ?? application.status}</span>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
