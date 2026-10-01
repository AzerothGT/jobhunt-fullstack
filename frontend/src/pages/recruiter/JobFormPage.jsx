import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState, ErrorState, LoadingState } from '../../components/PageState.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
      toast.success(isEdit ? 'Lowongan diperbarui.' : 'Lowongan dipublikasikan.')
      navigate(`/jobs/${result.job.id}`)
    } catch (requestError) {
      setSubmitError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Memuat lowongan…" />
  if (error) return <ErrorState message={error} onRetry={() => setRetry((value) => value + 1)} />
  if (missing) return <EmptyState title="Lowongan tidak ditemukan"><Link to="/dashboard">Kembali ke ruang rekrutmen</Link></EmptyState>

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {isEdit ? 'Perbarui posisi' : 'Bagikan kesempatan'}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{isEdit ? 'Edit lowongan.' : 'Pasang lowongan.'}</h1>
        <p className="text-muted-foreground">Informasi yang jelas membantu kandidat menemukan kecocokan.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit lowongan' : 'Lowongan baru'}</CardTitle>
          <CardDescription>Lengkapi detail posisi di bawah ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <datalist id="job-location-options"><option value="Remote" /></datalist>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="title">Jabatan *</FieldLabel>
                  <Input id="title" name="title" value={values.title} onChange={change} required maxLength="160" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="company">Perusahaan *</FieldLabel>
                  <Input id="company" name="company" value={values.company} onChange={change} required maxLength="160" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="location">Lokasi</FieldLabel>
                  <Input
                    id="location"
                    name="location"
                    value={values.location}
                    onChange={change}
                    maxLength="160"
                    placeholder="Contoh: Jakarta / Remote"
                    list="job-location-options"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="type">Jenis kerja *</FieldLabel>
                  <Select value={values.type} onValueChange={(value) => setValues((current) => ({ ...current, type: value }))}>
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {JOB_TYPES.map(([value]) => (
                          <SelectItem key={value} value={value}>{jobTypeLabel(value)}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="description">Deskripsi pekerjaan *</FieldLabel>
                <Textarea id="description" name="description" value={values.description} onChange={change} rows="8" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="requirements">Kualifikasi</FieldLabel>
                <Textarea id="requirements" name="requirements" value={values.requirements} onChange={change} rows="5" />
                <FieldDescription>Opsional</FieldDescription>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="salary_min">Gaji minimum</FieldLabel>
                  <Input
                    id="salary_min"
                    name="salary_min"
                    type="number"
                    min="0"
                    step="1"
                    value={values.salary_min}
                    onChange={change}
                    placeholder="Rp"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="salary_max">Gaji maksimum</FieldLabel>
                  <Input
                    id="salary_max"
                    name="salary_max"
                    type="number"
                    min="0"
                    step="1"
                    value={values.salary_max}
                    onChange={change}
                    placeholder="Rp"
                  />
                </Field>
              </div>
            </FieldGroup>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" render={<Link to="/dashboard" />}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Publikasikan lowongan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
