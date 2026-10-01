import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import JobCard from '../components/JobCard.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx'
import { useBookmarks } from '../hooks/useBookmarks.js'

export default function SavedJobsPage() {
  const { bookmarks, loading, error, isBookmarked, toggle, refresh } = useBookmarks(true)

  async function toggleBookmark(jobId, bookmarked) {
    try {
      await toggle(jobId, bookmarked)
      toast.success(bookmarked ? 'Simpanan dihapus.' : 'Lowongan disimpan.')
    } catch {
      toast.error('Gagal mengubah simpanan.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Koleksi pribadi</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Lowongan tersimpan.</h1>
        <p className="text-muted-foreground">Pekerjaan yang Anda tandai untuk dilihat lagi nanti.</p>
      </header>
      {loading ? <LoadingState label="Memuat simpanan…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {!loading && !error && bookmarks.length === 0 ? (
        <EmptyState title="Belum ada simpanan">
          Tandai lowongan menarik dengan ikon simpan. <Link to="/jobs">Jelajahi lowongan</Link>
        </EmptyState>
      ) : null}
      {!loading && !error && bookmarks.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((job) => (
            <JobCard
              key={job.bookmark_id ?? job.id}
              job={job}
              bookmarked={isBookmarked(job.id)}
              onToggleBookmark={toggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  )
}
