import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import JobCard from '../components/JobCard.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useJobs } from '../hooks/useJobs.js'

export default function HomePage() {
  const { jobs, total, loading, error, refresh } = useJobs({ limit: 3 })

  return (
    <div className="flex flex-col gap-12">
      <section className="grid items-center gap-8 py-8 lg:grid-cols-2" aria-labelledby="home-title">
        <div className="flex flex-col items-start gap-5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Jurnal kerja · Edisi hari ini
          </p>
          <h1 id="home-title" className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Pekerjaan yang baik memberi ruang.
          </h1>
          <p className="max-w-md text-muted-foreground">
            Temukan tempat untuk mengerjakan hal yang berarti—dan orang-orang yang ingin mengerjakannya bersama Anda.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link to="/jobs" />}>
              Cari Kerja
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button variant="outline" render={<Link to="/jobs/create" />}>Pasang Lowongan</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong className="text-2xl font-bold text-foreground">
              {loading ? '—' : total.toLocaleString('id-ID')}
            </strong>{' '}
            lowongan aktif sedang menunggu
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardDescription>Catatan redaksi · 01</CardDescription>
            <CardTitle className="text-2xl">Karier bukan garis lurus.</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Temukan langkah berikutnya, dengan cara Anda sendiri.
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="featured-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Pilihan terkini</p>
            <h2 id="featured-title" className="text-2xl font-bold tracking-tight">Dari papan kerja</h2>
          </div>
          <Button variant="link" render={<Link to="/jobs" />}>
            Semua lowongan
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
        {loading ? <LoadingState label="Mengumpulkan lowongan terbaru…" /> : null}
        {!loading && error ? <ErrorState message={error} onRetry={refresh} /> : null}
        {!loading && !error && jobs.length === 0 ? <EmptyState title="Belum ada lowongan aktif">Kembali lagi nanti untuk melihat kesempatan baru.</EmptyState> : null}
        {!loading && !error && jobs.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{jobs.map((job) => <JobCard key={job.id} job={job} />)}</div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <Separator />
        <div className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Untuk pemberi kerja</p>
            <p className="text-lg font-medium">Temukan rekan yang tepat untuk pekerjaan yang penting.</p>
          </div>
          <Button variant="outline" render={<Link to="/jobs/create" />}>Mulai pasang lowongan</Button>
        </div>
      </section>
    </div>
  )
}
