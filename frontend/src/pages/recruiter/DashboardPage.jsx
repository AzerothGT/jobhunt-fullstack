import { ArrowRight, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.jsx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Dasbor recruiter</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Kerja yang tumbuh.</h1>
          <p className="text-muted-foreground">Kelola kesempatan dan temukan orang yang tepat.</p>
        </div>
        <Button render={<Link to="/jobs/create" />}>
          <Plus data-icon="inline-start" />
          Pasang lowongan
        </Button>
      </header>
      {loading ? <LoadingState label="Memuat ringkasan rekrutmen…" /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={retryLoad} /> : null}
      {!loading && !error && stats && (
        <>
          <section className="grid gap-4 sm:grid-cols-2" aria-label="Ringkasan rekrutmen">
            <Card>
              <CardHeader>
                <CardDescription>Lowongan Anda</CardDescription>
                <CardTitle className="text-4xl">{stats.total_jobs ?? 0}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">posisi dipublikasikan</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total pelamar</CardDescription>
                <CardTitle className="text-4xl">{stats.total_applicants ?? 0}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">kandidat telah menghubungi</CardContent>
            </Card>
          </section>
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Daftar posisi</p>
                <h2 className="text-2xl font-bold tracking-tight">Lowongan Anda</h2>
              </div>
              <Button variant="link" render={<Link to="/jobs/create" />}>
                Tambah posisi
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
            {jobs.length === 0 ? <EmptyState title="Belum ada lowongan">Mulai dengan mempublikasikan posisi pertama Anda.</EmptyState> : (
              <div className="flex flex-col gap-3">
                {jobs.map((job) => (
                  <Card key={job.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={job.is_active ? 'default' : 'secondary'}>
                            {job.is_active ? 'Aktif' : 'Ditutup'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{job.location}</span>
                        </div>
                        <p className="truncate text-lg font-semibold">{job.title}</p>
                        <p className="text-sm text-muted-foreground">{job.company}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button variant="ghost" size="sm" render={<Link to={`/jobs/${job.id}/applicants`} />}>
                          Lihat pelamar
                        </Button>
                        <Button variant="ghost" size="sm" render={<Link to={`/jobs/${job.id}/edit`} />}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" render={<Link to={`/jobs/${job.id}`} />}>
                          Lihat
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
