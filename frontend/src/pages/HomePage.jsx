import { Link } from 'react-router-dom'
import JobCard from '../components/JobCard.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx'
import { useJobs } from '../hooks/useJobs.js'

export default function HomePage() {
  const { jobs, total, loading, error, refresh } = useJobs({ limit: 3 })

  return (
    <div className="home-page page-shell">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <span className="eyebrow">JURNAL KERJA · EDISI HARI INI</span>
          <h1 id="home-title">Pekerjaan yang baik memberi <em>ruang.</em></h1>
          <p className="hero-intro">Temukan tempat untuk mengerjakan hal yang berarti—dan orang-orang yang ingin mengerjakannya bersama Anda.</p>
          <div className="hero-actions">
            <Link className="button" to="/jobs">Cari Kerja <span aria-hidden="true">↗</span></Link>
            <Link className="button button-outline" to="/jobs/create">Pasang Lowongan <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="hero-count"><span className="count-number">{loading ? '—' : total.toLocaleString('id-ID')}</span><span>lowongan aktif<br />sedang menunggu</span></div>
        </div>
        <div className="hero-aside" aria-label="Catatan redaksi">
          <div className="hero-orbit" aria-hidden="true"><span>R</span><i /><b /></div>
          <div className="aside-note">
            <span className="eyebrow">CATATAN REDAKSI · 01</span>
            <p>Karier bukan garis lurus. Temukan langkah berikutnya, dengan cara Anda sendiri.</p>
            <span className="aside-signature">— JobHunt</span>
          </div>
          <span className="hero-aside-index">VOL. 01 / 2025</span>
        </div>
      </section>

      <section className="featured-section" aria-labelledby="featured-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PILIHAN TERKINI</span>
            <h2 id="featured-title">Dari papan kerja</h2>
          </div>
          <Link className="text-link" to="/jobs">Semua lowongan <span aria-hidden="true">↗</span></Link>
        </div>
        {loading ? <LoadingState label="Mengumpulkan lowongan terbaru…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={refresh} /> : null}
        {!loading && !error && jobs.length === 0 ? <EmptyState title="Belum ada lowongan aktif">Kembali lagi nanti untuk melihat kesempatan baru.</EmptyState> : null}
        {!loading && !error && jobs.length > 0 && (
          <div className="job-grid job-grid-home">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
        )}
      </section>

      <section className="home-note">
        <span className="eyebrow">UNTUK PEMBERI KERJA</span>
        <p>Temukan rekan yang tepat untuk pekerjaan yang penting.</p>
        <Link className="text-link" to="/jobs/create">Mulai pasang lowongan <span aria-hidden="true">↗</span></Link>
      </section>
    </div>
  )
}
