import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../utils/api.js'
import { validateApplyStep } from '../utils/applyWizardValidation.js'

const STEPS = [
  { key: 'personal', label: 'Personal' },
  { key: 'additional', label: 'Additional' },
  { key: 'review', label: 'Review' },
]

const initialValues = {
  full_name: '',
  phone: '',
  email: '',
  website: '',
  portfolio_url: '',
  cover_letter: '',
  resume_name: '',
  resume_size: '',
}

function trimOrEmpty(value) {
  return String(value ?? '').trim()
}

export default function ApplyWizardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [values, setValues] = useState(initialValues)
  const [resumeFile, setResumeFile] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const current = STEPS[step].key

  function change(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function changeResume(event) {
    const file = event.target.files?.[0] ?? null
    setResumeFile(file)
    setValues((prev) => ({
      ...prev,
      resume_name: file ? file.name : '',
      resume_size: file ? file.size : '',
    }))
  }

  function goNext() {
    setError('')
    if (current === 'review') return
    const validationError = validateApplyStep(current, values)
    if (validationError) {
      setError(validationError)
      return
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  function goBack() {
    setError('')
    setStep((prev) => Math.max(prev - 1, 0))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    const personalError = validateApplyStep('personal', values)
    if (personalError) {
      setStep(0)
      setError(personalError)
      return
    }
    const additionalError = validateApplyStep('additional', values)
    if (additionalError) {
      setStep(1)
      setError(additionalError)
      return
    }

    const resumeName = trimOrEmpty(values.resume_name)
    const form = new FormData()
    form.append('full_name', trimOrEmpty(values.full_name))
    form.append('phone', trimOrEmpty(values.phone))
    form.append('email', trimOrEmpty(values.email))
    if (trimOrEmpty(values.website)) form.append('website', trimOrEmpty(values.website))
    if (trimOrEmpty(values.portfolio_url)) form.append('portfolio_url', trimOrEmpty(values.portfolio_url))
    form.append('cover_letter', trimOrEmpty(values.cover_letter))
    if (resumeFile) form.append('resume', resumeFile, resumeFile.name || resumeName)

    setSubmitting(true)
    try {
      await api(`/jobs/${id}/applications`, { method: 'POST', body: form })
      setSubmitted(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="page-shell job-form-page">
        <header className="page-heading">
          <span className="eyebrow">LAMARAN TERKIRIM</span>
          <h1>Lamaran <em>terkirim.</em></h1>
          <p>Lamaran Anda untuk lowongan #{id} sudah diteruskan ke perekrut.</p>
        </header>
        <div className="success-note" role="status"><span aria-hidden="true">✓</span> Lamaran Anda sudah terkirim.</div>
        <div className="form-actions">
          <Link className="quiet-button" to={`/jobs/${id}`}>Kembali ke detail lowongan</Link>
          <button className="button" type="button" onClick={() => navigate('/applications')}>Lihat lamaran saya <span aria-hidden="true">↗</span></button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell job-form-page">
      <Link className="back-link" to={`/jobs/${id}`}>← Kembali ke detail lowongan</Link>
      <header className="page-heading">
        <span className="eyebrow">LAMAR PEKERJAAN</span>
        <h1>Lamar <em>pekerjaan.</em></h1>
        <p>Tiga langkah singkat: data pribadi, tambahan, lalu tinjau sebelum dikirim.</p>
      </header>

      <ol className="wizard-steps" aria-label="Apply steps">
        {STEPS.map((item, index) => (
          <li key={item.key} aria-current={index === step ? 'step' : undefined} className={index === step ? 'wizard-step-active' : index < step ? 'wizard-step-done' : ''}>
            <span className="eyebrow">STEP {index + 1}</span>
            <strong>{item.label}</strong>
          </li>
        ))}
      </ol>

      <form className="job-form form-stack" onSubmit={submit}>
        {error && <p className="form-error" role="alert">{error}</p>}

        {current === 'personal' && (
          <>
            <div className="form-two-col">
              <label htmlFor="full_name">Full name <span className="required-mark">*</span><input id="full_name" name="full_name" value={values.full_name} onChange={change} required maxLength="160" placeholder="Nama lengkap" /></label>
              <label htmlFor="phone">Phone number <span className="required-mark">*</span><input id="phone" name="phone" value={values.phone} onChange={change} required maxLength="40" placeholder="+62 ..." /></label>
            </div>
            <label htmlFor="email">Email address <span className="required-mark">*</span><input id="email" name="email" type="email" value={values.email} onChange={change} required maxLength="160" placeholder="nama@email.com" /></label>
            <div className="form-two-col">
              <label htmlFor="website">Website <span className="field-hint">Opsional</span><input id="website" name="website" value={values.website} onChange={change} maxLength="255" placeholder="situs-anda.com" /></label>
              <label htmlFor="portfolio_url">Portfolio URL <span className="field-hint">Opsional</span><input id="portfolio_url" name="portfolio_url" value={values.portfolio_url} onChange={change} maxLength="255" placeholder="behance.net/nama" /></label>
            </div>
          </>
        )}

        {current === 'additional' && (
          <>
            <label htmlFor="cover_letter">Cover letter <span className="required-mark">*</span><textarea id="cover_letter" name="cover_letter" value={values.cover_letter} onChange={change} rows="6" required placeholder="Ceritakan singkat mengapa Anda cocok untuk peran ini." /></label>
            <label htmlFor="resume">Resume file <span className="field-hint">Opsional · PDF, DOC, DOCX · maks 12MB</span><input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" onChange={changeResume} /></label>
            {trimOrEmpty(values.resume_name) && <p className="form-note">Terpilih: {trimOrEmpty(values.resume_name)}</p>}
          </>
        )}

        {current === 'review' && (
          <section aria-label="Review">
            <dl className="job-facts">
              <div><dt>Full name</dt><dd>{trimOrEmpty(values.full_name) || '—'}</dd></div>
              <div><dt>Phone number</dt><dd>{trimOrEmpty(values.phone) || '—'}</dd></div>
              <div><dt>Email address</dt><dd>{trimOrEmpty(values.email) || '—'}</dd></div>
              <div><dt>Cover letter</dt><dd>{trimOrEmpty(values.cover_letter) || '—'}</dd></div>
              <div><dt>Resume</dt><dd>{trimOrEmpty(values.resume_name) || 'Tanpa file'}</dd></div>
            </dl>
          </section>
        )}

        <div className="form-actions">
          {step > 0 && <button className="quiet-button" type="button" onClick={goBack}>Back</button>}
          {current !== 'review'
            ? <button className="button" type="button" onClick={goNext}>Continue <span aria-hidden="true">→</span></button>
            : <button className="button" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Submit application'} <span aria-hidden="true">↗</span></button>}
        </div>
      </form>
    </div>
  )
}
