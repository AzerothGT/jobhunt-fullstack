import JobCard from '../components/JobCard.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx'
import { useJobs } from '../hooks/useJobs.js'
import { JOB_TYPES, jobTypeLabel } from '../utils/format.js'

export default function JobsPage() {
  const { jobs, filters, setFilter, page, total, totalPages, loading, error, refresh } = useJobs()

  return (
    <div className="page-shell listing-page">
      <header className="page-heading">
        <span className="eyebrow">ARSIP LOWONGAN · {total.toLocaleString('id-ID')} HASIL</span>
        <h1>Temukan pekerjaan <em>berikutnya.</em></h1>
        <p>Kesempatan baru dari tim yang sedang membangun sesuatu.</p>
      </header>

      <section className="filter-panel" aria-label="Filter lowongan">
        <datalist id="job-location-options"><option value="Remote" /></datalist>
        <label className="search-field">
          <span className="eyebrow">KATA KUNCI</span>
          <input type="search" value={filters.keyword} onChange={(event) => setFilter('keyword', event.target.value)} placeholder="Jabatan, perusahaan…" />
        </label>
        <label>
          <span className="eyebrow">JENIS KERJA</span>
          <select value={filters.type} onChange={(event) => setFilter('type', event.target.value)}>
            <option value="">Semua jenis</option>
            {JOB_TYPES.map(([value]) => <option key={value} value={value}>{jobTypeLabel(value)}</option>)}
          </select>
        </label>
        <label>
          <span className="eyebrow">LOKASI</span>
          <input type="search" list="job-location-options" value={filters.location} onChange={(event) => setFilter('location', event.target.value)} placeholder="Kota atau Remote" />
        </label>
        <label>
          <span className="eyebrow">URUTKAN</span>
          <select value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)}>
            <option value="recent">Terbaru</option>
            <option value="applicants">Pelamar terbanyak</option>
          </select>
        </label>
      </section>

      <div className="results-meta">
        <p><strong>{total.toLocaleString('id-ID')}</strong> lowongan ditemukan</p>
        {filters.sort === 'applicants' && <span className="eyebrow">JUMLAH PELAMAR DITAMPILKAN</span>}
      </div>
      {loading ? <LoadingState label="Mencari lowongan…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {!loading && !error && jobs.length === 0 ? <EmptyState title="Tidak ada lowongan yang cocok">Coba ubah kata kunci atau filter pencarian Anda.</EmptyState> : null}
      {!loading && !error && jobs.length > 0 && (
        <>
          <div className="job-grid">{jobs.map((job) => <JobCard key={job.id} job={job} showApplicants={filters.sort === 'applicants'} />)}</div>
          {totalPages > 1 && (
            <nav className="pagination" aria-label="Halaman lowongan">
              <button className="button button-outline" type="button" disabled={page <= 1} onClick={() => setFilter('page', page - 1)}>← Sebelumnya</button>
              <span className="eyebrow">HALAMAN {page} DARI {totalPages}</span>
              <button className="button button-outline" type="button" disabled={page >= totalPages} onClick={() => setFilter('page', page + 1)}>Berikutnya →</button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
