import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.jsx'
import { api } from '../../utils/api.js'
import { validateJobForm } from '../../utils/jobFormValidation.js'
import { JOB_TYPES, jobTypeLabel } from '../../utils/format.js'

const initialValues = { title: '', company: '', location: '', type: 'full-time', description: '', requirements: '', salary_min: '', salary_max: '' }

export default function JobFormPage({ mode }) {
  const isEdit = mode === 'edit'
  const { id } = useParams()
  const navigate = useNavigate()
  const [values, setValues] = useState(initialValues)
  const [loadedKey, setLoadedKey] = useState(null)
  const [error, setError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retry, setRetry] = useState(0)
  const [missing, setMissing] = useState(false)
  const requestKey = `${id}:${retry}`
  const loading = isEdit && loadedKey !== requestKey

  useEffect(() => {
    if (!isEdit) return undefined
    const controller = new AbortController()
    api(`/jobs/${id}`, { signal: controller.signal })
      .then(({ job }) => {
        if (controller.signal.aborted) return
        setError('')
        if (!job) {
          setMissing(true)
          setLoadedKey(requestKey)
          return
        }
        setMissing(false)
        setValues({
          title: job.title ?? '',
          company: job.company ?? '',
          location: job.location ?? '',
          type: job.type ?? 'full-time',
          description: job.description ?? '',
          requirements: job.requirements ?? '',
          salary_min: job.salary_min ?? '',
          salary_max: job.salary_max ?? '',
        })
        setLoadedKey(requestKey)
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError.message)
          setLoadedKey(requestKey)
        }
      })
    return () => controller.abort()
  }, [id, isEdit, retry, requestKey])

  function change(event) {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitError('')
    const validationError = validateJobForm(values)
    if (validationError) return setSubmitError(validationError)
    const minimum = values.salary_min == null || String(values.salary_min).trim() === '' ? null : Number(values.salary_min)
    const maximum = values.salary_max == null || String(values.salary_max).trim() === '' ? null : Number(values.salary_max)

    const body = {
      title: values.title.trim(),
      company: values.company.trim(),
      location: values.location.trim() || null,
      type: values.type,
      description: values.description.trim(),
      requirements: values.requirements.trim() || null,
      salary_min: minimum,
      salary_max: maximum,
    }
    setSubmitting(true)
    try {
      const result = await api(isEdit ? `/jobs/${id}` : '/jobs', { method: isEdit ? 'PUT' : 'POST', body })
      navigate(`/jobs/${result.job.id}`)
    } catch (requestError) {
      setSubmitError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="page-shell"><LoadingState label="Memuat lowongan…" /></div>
  if (error) return <div className="page-shell"><ErrorState message={error} onRetry={() => setRetry((value) => value + 1)} /></div>
  if (missing) return <div className="page-shell"><EmptyState title="Lowongan tidak ditemukan"><Link to="/dashboard">Kembali ke ruang rekrutmen</Link></EmptyState></div>

  return (
    <div className="page-shell job-form-page">
      <Link className="back-link" to="/dashboard">← Dasbor recruiter</Link>
      <header className="page-heading"><span className="eyebrow">{isEdit ? 'PERBARUI POSISI' : 'BAGIKAN KESEMPATAN'}</span><h1>{isEdit ? 'Edit lowongan.' : 'Pasang lowongan.'}</h1><p>Informasi yang jelas membantu kandidat menemukan kecocokan.</p></header>
      <form className="job-form form-stack" onSubmit={submit}>
        {submitError && <p className="form-error" role="alert">{submitError}</p>}
        <datalist id="job-location-options"><option value="Remote" /></datalist>
        <div className="form-two-col">
          <label htmlFor="title">Jabatan <span className="required-mark">*</span><input id="title" name="title" value={values.title} onChange={change} required maxLength="160" /></label>
          <label htmlFor="company">Perusahaan <span className="required-mark">*</span><input id="company" name="company" value={values.company} onChange={change} required maxLength="160" /></label>
          <label htmlFor="location">Lokasi<input id="location" name="location" value={values.location} onChange={change} maxLength="160" placeholder="Contoh: Jakarta / Remote" list="job-location-options" /></label>
          <label htmlFor="type">Jenis kerja <span className="required-mark">*</span><select id="type" name="type" value={values.type} onChange={change} required>{JOB_TYPES.map(([value]) => <option key={value} value={value}>{jobTypeLabel(value)}</option>)}</select></label>
        </div>
        <label htmlFor="description">Deskripsi pekerjaan <span className="required-mark">*</span><textarea id="description" name="description" value={values.description} onChange={change} rows="8" required /></label>
        <label htmlFor="requirements">Kualifikasi <span className="field-hint">Opsional</span><textarea id="requirements" name="requirements" value={values.requirements} onChange={change} rows="5" /></label>
        <fieldset className="salary-fields"><legend>Kisaran gaji <span className="field-hint">Opsional · kosongkan jika tidak ingin ditampilkan</span></legend>
          <label htmlFor="salary_min">Minimum<input id="salary_min" name="salary_min" type="number" min="0" step="1" value={values.salary_min} onChange={change} placeholder="Rp" /></label>
          <label htmlFor="salary_max">Maksimum<input id="salary_max" name="salary_max" type="number" min="0" step="1" value={values.salary_max} onChange={change} placeholder="Rp" /></label>
        </fieldset>
        <div className="form-actions"><Link className="quiet-button" to="/dashboard">Batal</Link><button className="button" type="submit" disabled={submitting}>{submitting ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Publikasikan lowongan'} <span aria-hidden="true">↗</span></button></div>
      </form>
    </div>
  )
}
