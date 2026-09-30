import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../utils/api.js'
import { validateApplyStep } from '../utils/applyWizardValidation.js'

const STEPS = [
  { key: 'personal', label: 'Personal' },
  { key: 'additional', label: 'Additional' },
  { key: 'review', label: 'Review' },
]

const STEP_HEADINGS = {
  personal: {
    title: 'Personal information',
    description: 'Let us get to know you a bit better by sharing your basic info.',
  },
  additional: {
    title: 'Additional information',
    description: 'In order to match you with the right opportunities we need some additional information first.',
  },
  review: {
    title: 'Review your application',
    description: 'Is the information you have submitted correct?',
  },
}

const PHONE_CODES = [
  { code: '+62', label: 'ID' },
  { code: '+60', label: 'MY' },
  { code: '+65', label: 'SG' },
  { code: '+1', label: 'US' },
  { code: '+44', label: 'UK' },
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

function filled(value) {
  return trimOrEmpty(value) !== ''
}

function formatSize(size) {
  const bytes = Number(size)
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes >= 1024 * 1024) return `${trimNumber(bytes / (1024 * 1024))}MB`
  if (bytes >= 1024) return `${trimNumber(bytes / 1024)}KB`
  return `${bytes}B`
}

function trimNumber(value) {
  return String(Math.round(value * 10) / 10)
}

function splitPhone(phone) {
  const text = trimOrEmpty(phone)
  const match = PHONE_CODES.find(({ code }) => text === code || text.startsWith(`${code} `))
  if (!match) return { code: PHONE_CODES[0].code, rest: text }
  return { code: match.code, rest: text.slice(match.code.length).trim() }
}

export default function ApplyWizardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [values, setValues] = useState(initialValues)
  const [resumeFile, setResumeFile] = useState(null)
  const [job, setJob] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const current = STEPS[step].key
  const heading = STEP_HEADINGS[current]
  const stepBlocked = current === 'review' ? null : validateApplyStep(current, values)
  const phoneParts = splitPhone(values.phone)

  useEffect(() => {
    const controller = new AbortController()
    api(`/jobs/${id}`, { signal: controller.signal })
      .then(({ job: result }) => {
        if (!controller.signal.aborted) setJob(result ?? null)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [id])

  function change(event) {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function changePhoneCode(event) {
    const code = event.target.value
    const { rest } = splitPhone(values.phone)
    setValues((prev) => ({ ...prev, phone: trimOrEmpty(rest) ? `${code} ${trimOrEmpty(rest)}` : '' }))
  }

  function changePhoneRest(event) {
    const rest = event.target.value
    const { code } = splitPhone(values.phone)
    setValues((prev) => ({ ...prev, phone: trimOrEmpty(rest) ? `${code} ${trimOrEmpty(rest)}` : '' }))
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

  function removeResume() {
    setResumeFile(null)
    setValues((prev) => ({ ...prev, resume_name: '', resume_size: '' }))
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

  function editStep(index) {
    setError('')
    setStep(index)
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

  const company = trimOrEmpty(job?.company) || 'Perusahaan'
  const jobTitle = trimOrEmpty(job?.title) || 'Lowongan'

  if (submitted) {
    return (
      <div className="apply-wizard">
        <div className="wizard-card">
          <div className="wizard-success" role="status">
            <span className="wizard-success-mark" aria-hidden="true">✓</span>
            <h1>Application sent!</h1>
            <p>Lamaran Anda untuk {jobTitle} di {company} sudah diteruskan ke perekrut.</p>
          </div>
          <div className="wizard-actions">
            <Link className="wizard-quiet" to={`/jobs/${id}`}>Kembali ke detail lowongan</Link>
            <button className="wizard-button" type="button" onClick={() => navigate('/applications')}>Lihat lamaran saya</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="apply-wizard">
      <div className="wizard-card">
        <header className="wizard-top">
          <Link className="wizard-back" to={`/jobs/${id}`} aria-label="Back to job detail">‹</Link>
          <span className="wizard-avatar" aria-hidden="true">{company.charAt(0).toUpperCase()}</span>
          <div className="wizard-job">
            <strong>{jobTitle}</strong>
            <span>{company}</span>
          </div>
          <button className="wizard-kebab" type="button" aria-label="More options" tabIndex={-1}>⋮</button>
        </header>

        <ol className="wizard-steps" aria-label="Apply steps">
          {STEPS.map((item, index) => {
            const state = index < step ? 'done' : index === step ? 'active' : 'todo'
            return (
              <li key={item.key} aria-current={index === step ? 'step' : undefined} className={`wizard-step-${state}`}>
                <span className="wizard-dot" aria-hidden="true">{index < step ? '✓' : index + 1}</span>
                <span className="wizard-step-label">{item.label}</span>
              </li>
            )
          })}
        </ol>

        <form className="wizard-form" onSubmit={submit}>
          <div className="wizard-heading">
            <h1>{heading.title}</h1>
            <p>{heading.description}</p>
            {current !== 'review' && <p className="wizard-required-note">*Required fields</p>}
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          {current === 'personal' && (
            <>
              <label className="wizard-field" htmlFor="full_name">
                <span className="wizard-label">Full name <span className="required-mark">*</span></span>
                <span className="wizard-control">
                  <input id="full_name" name="full_name" value={values.full_name} onChange={change} required maxLength="160" placeholder="Enter your full name" />
                  {filled(values.full_name) && <span className="wizard-check" aria-hidden="true">✓</span>}
                </span>
                <span className="wizard-hint">We&rsquo;re big on real names, so people know who&rsquo;s who.</span>
              </label>
              <div className="wizard-field">
                <span className="wizard-label" id="phone-label">Phone number <span className="required-mark">*</span></span>
                <span className="wizard-control wizard-phone" role="group" aria-labelledby="phone-label">
                  <span className="wizard-code">
                    <select aria-label="Country code" value={phoneParts.code} onChange={changePhoneCode}>
                      {PHONE_CODES.map(({ code, label }) => <option key={code} value={code}>{label} {code}</option>)}
                    </select>
                  </span>
                  <input id="phone" name="phone" value={phoneParts.rest} onChange={changePhoneRest} required maxLength="40" placeholder="+62 89 580 618 4222" inputMode="tel" />
                </span>
              </div>
              <label className="wizard-field" htmlFor="email">
                <span className="wizard-label">Email address <span className="required-mark">*</span></span>
                <span className="wizard-control">
                  <input id="email" name="email" type="email" value={values.email} onChange={change} required maxLength="160" placeholder="Enter your email address" />
                  {filled(values.email) && <span className="wizard-check" aria-hidden="true">✓</span>}
                </span>
              </label>
              <label className="wizard-field" htmlFor="website">
                <span className="wizard-label">Personal website</span>
                <span className="wizard-control wizard-affix">
                  <span className="wizard-prefix" aria-hidden="true">⊕</span>
                  <input id="website" name="website" value={values.website} onChange={change} maxLength="255" placeholder="Enter your full name" inputMode="url" />
                  {filled(values.website) && <span className="wizard-check" aria-hidden="true">✓</span>}
                </span>
                <span className="wizard-hint">Your home page, blog, or company site.</span>
              </label>
              <label className="wizard-field" htmlFor="portfolio_url">
                <span className="wizard-label">Portfolio URL</span>
                <span className="wizard-control">
                  <input id="portfolio_url" name="portfolio_url" value={values.portfolio_url} onChange={change} maxLength="255" placeholder="Enter your full name" inputMode="url" />
                  {filled(values.portfolio_url) && <span className="wizard-check" aria-hidden="true">✓</span>}
                </span>
                <span className="wizard-hint">Only shared with potential employers.</span>
              </label>
            </>
          )}

          {current === 'additional' && (
            <>
              <label className="wizard-field" htmlFor="cover_letter">
                <span className="wizard-label">Cover letter <span className="required-mark">*</span></span>
                <textarea id="cover_letter" name="cover_letter" value={values.cover_letter} onChange={change} rows="7" required placeholder="Sell yourself here.." />
              </label>
              <div className="wizard-field">
                <span className="wizard-label">Resume</span>
                {resumeFile ? (
                  <div className="wizard-file">
                    <span className="wizard-file-icon" aria-hidden="true">🗎</span>
                    <span className="wizard-file-meta">
                      <strong>{trimOrEmpty(values.resume_name)}</strong>
                      <span>{formatSize(values.resume_size)}</span>
                    </span>
                    <button className="wizard-file-remove" type="button" onClick={removeResume} aria-label="Remove resume">🗑</button>
                  </div>
                ) : null}
                <label className="wizard-upload" htmlFor="resume">
                  <span className="wizard-upload-plus" aria-hidden="true">+</span>
                  <span className="wizard-upload-text">
                    <strong>Add a file</strong>
                    <span>Max file size 12MB (.pdf, .doc, .docx)</span>
                  </span>
                </label>
                <input className="wizard-file-input" id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" onChange={changeResume} />
              </div>
            </>
          )}

          {current === 'review' && (
            <>
              <section className="wizard-review" aria-label="Personal information">
                <header><h2>Personal information</h2><button className="wizard-edit" type="button" onClick={() => editStep(0)}>✎ Edit</button></header>
                <dl>
                  <div><dt>Full name</dt><dd>{trimOrEmpty(values.full_name)}</dd></div>
                  <div><dt>Phone number</dt><dd>{trimOrEmpty(values.phone)}</dd></div>
                  <div><dt>Email address</dt><dd>{trimOrEmpty(values.email)}</dd></div>
                  <div><dt>Personal website</dt><dd>{filled(values.website) ? trimOrEmpty(values.website) : <span className="wizard-empty">No answer</span>}</dd></div>
                  <div><dt>Portfolio URL</dt><dd>{filled(values.portfolio_url) ? trimOrEmpty(values.portfolio_url) : <span className="wizard-empty">No answer</span>}</dd></div>
                </dl>
              </section>
              <section className="wizard-review" aria-label="Additional information">
                <header><h2>Additional information</h2><button className="wizard-edit" type="button" onClick={() => editStep(1)}>✎ Edit</button></header>
                <dl>
                  <div><dt>Cover letter</dt><dd className="wizard-letter">{trimOrEmpty(values.cover_letter)}</dd></div>
                  <div><dt>Resume</dt><dd>{resumeFile ? (
                    <span className="wizard-file">
                      <span className="wizard-file-icon" aria-hidden="true">🗎</span>
                      <span className="wizard-file-meta">
                        <strong>{trimOrEmpty(values.resume_name)}</strong>
                        <span>{formatSize(values.resume_size)}</span>
                      </span>
                    </span>
                  ) : <span className="wizard-empty">No answer</span>}</dd></div>
                </dl>
              </section>
            </>
          )}

          <div className="wizard-actions">
            {step > 0 && current !== 'review' && <button className="wizard-quiet" type="button" onClick={goBack}>Back</button>}
            {current !== 'review'
              ? <button className="wizard-button" type="button" onClick={goNext} disabled={Boolean(stepBlocked)}>Continue</button>
              : <button className="wizard-button" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Submit'}</button>}
          </div>
        </form>
      </div>
    </div>
  )
}
