import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
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
      toast.success('Lamaran terkirim.')
    } catch (requestError) {
      setApplyError(requestError.message)
    } finally {
      setApplying(false)
    }
  }

  if (loading) return <LoadingState label="Memuat detail lowongan…" />
  if (error) return <ErrorState message={error} onRetry={() => setRetry((value) => value + 1)} />
  if (!job) return <EmptyState title="Lowongan tidak ditemukan"><Link to="/jobs">Kembali ke daftar lowongan</Link></EmptyState>

  const salary = [formatSalary(job.salary_min), formatSalary(job.salary_max)].filter(Boolean)
  const salaryText = salary.length === 2 ? `${salary[0]} — ${salary[1]}` : salary[0]
  const requirements = Array.isArray(job.requirements) ? job.requirements : null

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" render={<Link to="/jobs" />} className="w-fit">
        <ArrowLeft data-icon="inline-start" />
        Kembali ke lowongan
      </Button>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <article className="flex flex-col gap-6 lg:col-span-2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{jobTypeLabel(job.type)}</Badge>
              <Badge variant={job.is_active ? 'default' : 'secondary'}>
                {job.is_active ? 'Menerima lamaran' : 'Lowongan ditutup'}
              </Badge>
            </div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {job.company} · Dipublikasikan {formatDate(job.created_at)}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{job.title}</h1>
            <p className="text-muted-foreground">{job.location}</p>
          </div>
          <Separator />
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Tentang pekerjaan</h2>
            <div className="leading-relaxed whitespace-pre-line">{job.description}</div>
          </section>
          {job.requirements && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Kualifikasi</h2>
              {requirements ? (
                <ul className="ml-5 flex list-disc flex-col gap-1">
                  {requirements.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              ) : (
                <div className="leading-relaxed whitespace-pre-line">{job.requirements}</div>
              )}
            </section>
          )}
        </article>
        <Card>
          <CardHeader>
            <CardDescription>Ringkasan</CardDescription>
            <CardTitle>{job.company}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Lokasi</dt>
                <dd className="text-right font-medium">{job.location}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Jenis</dt>
                <dd className="text-right font-medium">{jobTypeLabel(job.type)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Kisaran gaji</dt>
                <dd className="text-right font-medium">{salaryText || 'Dibicarakan saat wawancara'}</dd>
              </div>
            </dl>
            <Separator />
            {applied ? (
              <Alert>
                <AlertDescription>Lamaran Anda sudah terkirim.</AlertDescription>
              </Alert>
            ) : user?.role === 'recruiter' ? (
              <p className="text-sm text-muted-foreground">Akun rekruter tidak dapat mengirim lamaran.</p>
            ) : (
              <form className="flex flex-col gap-3" onSubmit={submitApplication}>
                {applyError && (
                  <Alert variant="destructive">
                    <AlertDescription>{applyError}</AlertDescription>
                  </Alert>
                )}
                {!job.is_active && <p className="text-sm text-muted-foreground">Lowongan ini sudah tidak menerima lamaran.</p>}
                {job.is_active && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="cover-letter">Pesan pengantar (opsional)</FieldLabel>
                      <Textarea
                        id="cover-letter"
                        rows="5"
                        value={coverLetter}
                        onChange={(event) => setCoverLetter(event.target.value)}
                        placeholder="Ceritakan singkat mengapa pekerjaan ini menarik bagi Anda."
                      />
                    </Field>
                    <Button type="submit" disabled={applying} className="w-full">
                      {applying ? 'Mengirim…' : user ? 'Kirim lamaran' : 'Masuk untuk melamar'}
                      <ArrowUpRight data-icon="inline-end" />
                    </Button>
                    <Button variant="link" size="sm" render={<Link to={`/jobs/${id}/apply`} />}>
                      atau lamar dengan formulir lengkap
                    </Button>
                  </>
                )}
              </form>
            )}
            <p className="text-xs text-muted-foreground">Pastikan profil Anda siap sebelum mengirim lamaran.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
