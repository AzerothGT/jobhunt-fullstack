import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.jsx'
import { useApplications } from '../../hooks/useApplications.js'
import { api } from '../../utils/api.js'
import { formatDate } from '../../utils/format.js'

const statuses = ['pending', 'reviewed', 'rejected']
const statusLabels = { pending: 'Menunggu', reviewed: 'Ditinjau', rejected: 'Ditolak' }

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
  if (loading) return <div className="page-shell"><LoadingState label="Memuat daftar kandidat…" /></div>
  if (error) return <div className="page-shell"><ErrorState message={error} onRetry={() => { setRetry((value) => value + 1); refresh() }} /></div>
  if (!job) return <div className="page-shell"><EmptyState title="Lowongan tidak ditemukan"><Link to="/dashboard">Kembali ke ruang rekrutmen</Link></EmptyState></div>

  return (
    <div className="page-shell applicants-page">
      <Link className="back-link" to="/dashboard">← Dasbor recruiter</Link>
      <header className="page-heading"><span className="eyebrow">KANDIDAT · {applications.length} LAMARAN</span><h1>{job.title}</h1><p>{job.company} · {job.location}</p></header>
      {applications.length === 0 ? <EmptyState title="Belum ada pelamar">Lamaran untuk posisi ini akan muncul di sini.</EmptyState> : (
        <div className="applicant-list applicants-table-scroll">
          <table className="applicants-table">
            <thead><tr><th scope="col">Kandidat / Kontak</th><th scope="col">Tanggal melamar</th><th scope="col">Surat lamaran</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {applications.map((application) => {
                const applicant = application.applicant ?? {}
                return (
                  <tr key={application.id}>
                    <td><div className="applicant-identity"><div className="applicant-avatar" aria-hidden="true">{applicant.name?.trim()?.charAt(0)?.toLocaleUpperCase('id-ID') || '?'}</div><div className="applicant-info"><h2>{applicant.name ?? 'Kandidat'}</h2><a href={`mailto:${applicant.email}`}>{applicant.email}</a></div></div></td>
                    <td>{formatDate(application.applied_at ?? application.created_at)}</td>
                    <td>{application.cover_letter ? <details className="cover-letter"><summary>Baca pesan pengantar</summary><p>{application.cover_letter}</p></details> : '—'}</td>
                    <td><label className="status-control" htmlFor={`status-${application.id}`}><span className="eyebrow">STATUS</span><select id={`status-${application.id}`} value={application.status} disabled={pendingId === application.id} onChange={(event) => changeStatus(application.id, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>{rowErrors[application.id] && <p className="form-error" role="alert">{rowErrors[application.id]}</p>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
