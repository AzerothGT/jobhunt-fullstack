import JobCard from '../components/JobCard.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx'
import { useBookmarks } from '../hooks/useBookmarks.js'
import { useAuth } from '../hooks/useAuth.js'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useJobs } from '../hooks/useJobs.js'
import { JOB_TYPES, jobTypeLabel } from '../utils/format.js'

export default function JobsPage() {
  const { jobs, filters, setFilter, page, total, totalPages, loading, error, refresh } = useJobs({ syncParams: true })
  const { user } = useAuth()
  const { isBookmarked, toggle } = useBookmarks(user?.role === 'job_seeker')

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
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Arsip lowongan · {total.toLocaleString('id-ID')} hasil
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Temukan pekerjaan berikutnya.</h1>
        <p className="text-muted-foreground">Kesempatan baru dari tim yang sedang membangun sesuatu.</p>
      </header>

      <Card>
        <CardContent>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filter lowongan">
            <datalist id="job-location-options"><option value="Remote" /></datalist>
            <Field>
              <FieldLabel htmlFor="filter-keyword">Kata kunci</FieldLabel>
              <Input
                id="filter-keyword"
                type="search"
                value={filters.keyword}
                onChange={(event) => setFilter('keyword', event.target.value)}
                placeholder="Jabatan, perusahaan…"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="filter-type">Jenis kerja</FieldLabel>
              <Select value={filters.type || 'all'} onValueChange={(value) => setFilter('type', value === 'all' ? '' : value)}>
                <SelectTrigger id="filter-type" className="w-full">
                  <SelectValue placeholder="Semua jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Semua jenis</SelectItem>
                    {JOB_TYPES.map(([value]) => (
                      <SelectItem key={value} value={value}>{jobTypeLabel(value)}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="filter-location">Lokasi</FieldLabel>
              <Input
                id="filter-location"
                type="search"
                list="job-location-options"
                value={filters.location}
                onChange={(event) => setFilter('location', event.target.value)}
                placeholder="Kota atau Remote"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="filter-sort">Urutkan</FieldLabel>
              <Select value={filters.sort} onValueChange={(value) => setFilter('sort', value)}>
                <SelectTrigger id="filter-sort" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="recent">Terbaru</SelectItem>
                    <SelectItem value="applicants">Pelamar terbanyak</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </section>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{total.toLocaleString('id-ID')}</strong> lowongan ditemukan
        </p>
        {filters.sort === 'applicants' && <Badge variant="secondary">Jumlah pelamar ditampilkan</Badge>}
      </div>
      {loading ? <LoadingState label="Mencari lowongan…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {!loading && !error && jobs.length === 0 ? <EmptyState title="Tidak ada lowongan yang cocok">Coba ubah kata kunci atau filter pencarian Anda.</EmptyState> : null}
      {!loading && !error && jobs.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                showApplicants={filters.sort === 'applicants'}
                bookmarked={isBookmarked(job.id)}
                onToggleBookmark={user?.role === 'job_seeker' ? toggleBookmark : null}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => { event.preventDefault(); setFilter('page', page - 1) }}
                    aria-disabled={page <= 1}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4 text-sm text-muted-foreground">
                    Halaman {page} dari {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => { event.preventDefault(); setFilter('page', page + 1) }}
                    aria-disabled={page >= totalPages}
                    className={page >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  )
}
