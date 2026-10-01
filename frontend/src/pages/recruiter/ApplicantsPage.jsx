import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.jsx'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useApplications } from '../../hooks/useApplications.js'
import { api } from '../../utils/api.js'
import { formatDate } from '../../utils/format.js'

const statuses = ['pending', 'reviewed', 'rejected']
const statusLabels = { pending: 'Menunggu', reviewed: 'Ditinjau', rejected: 'Ditolak' }
const statusVariants = { pending: 'secondary', reviewed: 'default', rejected: 'destructive' }

export default function ApplicantsPage() {
  const { id } = useParams()
  const { applications, loading: applicationsLoading, error: applicationsError, updateStatus, refresh } = useApplications('applicants', id)
  const [job, setJob] = useState(null)
  const [jobError, setJobError] = useState('')
  const [retry, setRetry] = useState(0)
  const [loadedKey, setLoadedKey] = useState(null)
  const requestKey = `${id}:${retry}`
  const jobLoading = loadedKey !== requestKey
  const [pendingId, setPendingId] = useState(null)
  const [rowErrors, setRowErrors] = useState({})

  useEffect(() => {
    const controller = new AbortController()
    api(`/jobs/${id}`, { signal: controller.signal })
      .then(({ job: result }) => {
        if (controller.signal.aborted) return
        setJob(result ?? null)
        setJobError('')
        setLoadedKey(requestKey)
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setJobError(requestError.message)
          setLoadedKey(requestKey)
        }
      })
    return () => controller.abort()
  }, [id, retry, requestKey])

  async function changeStatus(applicationId, status) {
    setPendingId(applicationId)
    setRowErrors((current) => ({ ...current, [applicationId]: '' }))
    try {
      await updateStatus(applicationId, status)
    } catch (requestError) {
      setRowErrors((current) => ({ ...current, [applicationId]: requestError.message }))
    } finally {
      setPendingId(null)
    }
  }

  const loading = jobLoading || applicationsLoading
  const error = jobError || applicationsError
  if (loading) return <LoadingState label="Memuat daftar kandidat…" />
  if (error) return <ErrorState message={error} onRetry={() => { setRetry((value) => value + 1); refresh() }} />
  if (!job) return <EmptyState title="Lowongan tidak ditemukan"><Link to="/dashboard">Kembali ke ruang rekrutmen</Link></EmptyState>

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" render={<Link to="/dashboard" />} className="w-fit">
        <ArrowLeft data-icon="inline-start" />
        Dasbor recruiter
      </Button>
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Kandidat · {applications.length} lamaran
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{job.title}</h1>
        <p className="text-muted-foreground">{job.company} · {job.location}</p>
      </header>
      {applications.length === 0 ? <EmptyState title="Belum ada pelamar">Lamaran untuk posisi ini akan muncul di sini.</EmptyState> : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daftar pelamar</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kandidat / Kontak</TableHead>
                  <TableHead>Tanggal melamar</TableHead>
                  <TableHead>Surat lamaran</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => {
                  const applicant = application.applicant ?? {}
                  return (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {applicant.name?.trim()?.charAt(0)?.toUpperCase('id-ID') || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{applicant.name ?? 'Kandidat'}</span>
                            <a href={`mailto:${applicant.email}`} className="text-sm text-primary hover:underline">
                              {applicant.email}
                            </a>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(application.applied_at ?? application.created_at)}</TableCell>
                      <TableCell>
                        {application.cover_letter ? (
                          <details className="text-sm text-muted-foreground">
                            <summary className="w-fit cursor-pointer font-medium text-primary">Baca pesan pengantar</summary>
                            <p className="mt-1 max-w-64 whitespace-pre-line">{application.cover_letter}</p>
                          </details>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-32 flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={statusVariants[application.status] ?? 'secondary'}>
                              {statusLabels[application.status] ?? application.status}
                            </Badge>
                          </div>
                          <Field>
                            <FieldLabel htmlFor={`status-${application.id}`} className="sr-only">Status</FieldLabel>
                            <Select
                              value={application.status}
                              disabled={pendingId === application.id}
                              onValueChange={(status) => changeStatus(application.id, status)}
                            >
                              <SelectTrigger id={`status-${application.id}`} size="sm" className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {statuses.map((status) => (
                                    <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>
                          {rowErrors[application.id] && <p className="text-sm text-destructive" role="alert">{rowErrors[application.id]}</p>}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
