import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useApplications } from '../hooks/useApplications.js'
import { formatDate, jobTypeLabel } from '../utils/format.js'

const statusLabels = { pending: 'Menunggu', reviewed: 'Ditinjau', rejected: 'Tidak terpilih' }
const statusVariants = { pending: 'secondary', reviewed: 'default', rejected: 'destructive' }

export default function ApplicationsPage() {
  const { applications, loading, error, refresh } = useApplications('mine')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Catatan perjalanan</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Lamaran saya.</h1>
        <p className="text-muted-foreground">Semua langkah yang sudah Anda ambil, tersusun di satu tempat.</p>
      </header>
      {loading ? <LoadingState label="Memuat riwayat lamaran…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={refresh} /> : null}
      {!loading && !error && applications.length === 0 ? <EmptyState title="Belum ada lamaran">Lowongan yang Anda lamar akan muncul di sini. <Link to="/jobs">Jelajahi lowongan</Link></EmptyState> : null}
      {!loading && !error && applications.length > 0 && (
        <div className="flex flex-col gap-4">
          {applications.map((application) => {
            const job = application.job ?? {}
            const jobId = job.id ?? application.job_id
            return (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={statusVariants[application.status] ?? 'secondary'}>
                      {statusLabels[application.status] ?? application.status}
                    </Badge>
                    <CardDescription>Dikirim {formatDate(application.applied_at ?? application.created_at)}</CardDescription>
                  </div>
                  <CardTitle className="text-xl">
                    {jobId ? <Link to={`/jobs/${jobId}`} className="hover:underline">{job.title ?? application.job_title ?? 'Lowongan'}</Link> : (job.title ?? application.job_title ?? 'Lowongan')}
                  </CardTitle>
                  <CardDescription>
                    {job.company ?? application.job_company ?? 'Perusahaan'}
                    {job.location ? ` · ${job.location}` : ''} · {jobTypeLabel(job.type)}
                  </CardDescription>
                </CardHeader>
                {application.cover_letter && (
                  <CardContent>
                    <details className="text-sm text-muted-foreground">
                      <summary className="w-fit cursor-pointer font-medium text-primary">Lihat pesan pengantar</summary>
                      <p className="mt-2 border-l-2 pl-3 whitespace-pre-line">{application.cover_letter}</p>
                    </details>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
