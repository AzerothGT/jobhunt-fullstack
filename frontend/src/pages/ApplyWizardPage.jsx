import { ArrowLeft, Check, FileText, Pencil, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from 'cn'
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

  function changePhoneCode(code) {
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
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Card>
          <CardHeader className="items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check />
            </span>
            <CardTitle className="text-2xl">Application sent!</CardTitle>
            <CardDescription>
              Lamaran Anda untuk {jobTitle} di {company} sudah diteruskan ke perekrut.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={() => navigate('/applications')}>Lihat lamaran saya</Button>
            <Button variant="ghost" render={<Link to={`/jobs/${id}`} />}>
              Kembali ke detail lowongan
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <Button variant="ghost" size="icon-sm" render={<Link to={`/jobs/${id}`} aria-label="Back to job detail" />}>
            <ArrowLeft />
          </Button>
          <Avatar>
            <AvatarFallback>{company.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <CardTitle className="truncate text-base">{jobTitle}</CardTitle>
            <CardDescription className="truncate">{company}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ol className="flex items-center gap-1" aria-label="Apply steps">
            {STEPS.map((item, index) => {
              const state = index < step ? 'done' : index === step ? 'active' : 'todo'
              return (
                <li key={item.key} aria-current={index === step ? 'step' : undefined} className="flex min-w-0 items-center gap-1.5">
                  {index > 0 && <Separator orientation="horizontal" className={cn('w-4 border-dashed', index <= step && 'border-primary')} />}
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-primary-foreground',
                      state === 'active' && 'bg-primary',
                      state === 'done' && 'bg-emerald-500',
                      state === 'todo' && 'bg-muted text-muted-foreground',
                    )}
                    aria-hidden="true"
                  >
                    {index < step ? <Check /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      'truncate text-xs font-semibold',
                      state === 'active' && 'text-primary',
                      state === 'done' && 'text-emerald-600',
                      state === 'todo' && 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </span>
                </li>
              )
            })}
          </ol>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold tracking-tight">{heading.title}</h1>
              <p className="text-sm text-muted-foreground">{heading.description}</p>
              {current !== 'review' && <p className="text-xs font-medium text-destructive">*Required fields</p>}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {current === 'personal' && (
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="full_name">
                    Full name <span className="required-mark text-destructive">*</span>
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="full_name"
                      name="full_name"
                      value={values.full_name}
                      onChange={change}
                      required
                      maxLength="160"
                      placeholder="Enter your full name"
                      aria-invalid={filled(values.full_name) ? undefined : true}
                      className="pr-9"
                    />
                    {filled(values.full_name) && (
                      <Check className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-500" aria-hidden="true" />
                    )}
                  </div>
                  <FieldDescription>We&rsquo;re big on real names, so people know who&rsquo;s who.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel id="phone-label">
                    Phone number <span className="required-mark text-destructive">*</span>
                  </FieldLabel>
                  <div className="flex gap-2" role="group" aria-labelledby="phone-label">
                    <Select value={phoneParts.code} onValueChange={changePhoneCode}>
                      <SelectTrigger aria-label="Country code" className="w-28 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {PHONE_CODES.map(({ code, label }) => (
                            <SelectItem key={code} value={code}>{label} {code}</SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      name="phone"
                      value={phoneParts.rest}
                      onChange={changePhoneRest}
                      required
                      maxLength="40"
                      placeholder="+62 89 580 618 4222"
                      inputMode="tel"
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">
                    Email address <span className="required-mark text-destructive">*</span>
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={values.email}
                      onChange={change}
                      required
                      maxLength="160"
                      placeholder="Enter your email address"
                      className="pr-9"
                    />
                    {filled(values.email) && (
                      <Check className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-500" aria-hidden="true" />
                    )}
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="website">Personal website</FieldLabel>
                  <div className="relative">
                    <Input
                      id="website"
                      name="website"
                      value={values.website}
                      onChange={change}
                      maxLength="255"
                      placeholder="rickgrimes.com"
                      inputMode="url"
                      className="pr-9"
                    />
                    {filled(values.website) && (
                      <Check className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-500" aria-hidden="true" />
                    )}
                  </div>
                  <FieldDescription>Your home page, blog, or company site.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="portfolio_url">Portfolio URL</FieldLabel>
                  <div className="relative">
                    <Input
                      id="portfolio_url"
                      name="portfolio_url"
                      value={values.portfolio_url}
                      onChange={change}
                      maxLength="255"
                      placeholder="dribbble.com/rickgrimes"
                      inputMode="url"
                      className="pr-9"
                    />
                    {filled(values.portfolio_url) && (
                      <Check className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-500" aria-hidden="true" />
                    )}
                  </div>
                  <FieldDescription>Only shared with potential employers.</FieldDescription>
                </Field>
              </FieldGroup>
            )}

            {current === 'additional' && (
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="cover_letter">
                    Cover letter <span className="required-mark text-destructive">*</span>
                  </FieldLabel>
                  <Textarea
                    id="cover_letter"
                    name="cover_letter"
                    value={values.cover_letter}
                    onChange={change}
                    rows="7"
                    required
                    placeholder="Sell yourself here.."
                  />
                </Field>
                <Field>
                  <FieldLabel>Resume</FieldLabel>
                  {resumeFile && (
                    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <FileText />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <strong className="truncate text-sm">{trimOrEmpty(values.resume_name)}</strong>
                        <span className="text-xs text-muted-foreground">{formatSize(values.resume_size)}</span>
                      </span>
                      <Button variant="ghost" size="icon-sm" type="button" onClick={removeResume} aria-label="Remove resume" className="ml-auto">
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                  <Button variant="outline" render={<label htmlFor="resume" className="cursor-pointer" />}>
                    <Upload data-icon="inline-start" />
                    Add a file
                  </Button>
                  <input
                    id="resume"
                    name="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={changeResume}
                    className="sr-only"
                  />
                  <FieldDescription>Max file size 12MB (.pdf, .doc, .docx)</FieldDescription>
                </Field>
              </FieldGroup>
            )}

            {current === 'review' && (
              <div className="flex flex-col gap-4">
                <section className="flex flex-col gap-2" aria-label="Personal information">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold">Personal information</h2>
                    <Button variant="outline" size="sm" type="button" onClick={() => editStep(0)}>
                      <Pencil data-icon="inline-start" />
                      Edit
                    </Button>
                  </div>
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex flex-col">
                      <dt className="text-muted-foreground">Full name</dt>
                      <dd className="font-medium">{trimOrEmpty(values.full_name)}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-muted-foreground">Phone number</dt>
                      <dd className="font-medium">{trimOrEmpty(values.phone)}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-muted-foreground">Email address</dt>
                      <dd className="font-medium">{trimOrEmpty(values.email)}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-muted-foreground">Personal website</dt>
                      <dd className="font-medium">{filled(values.website) ? trimOrEmpty(values.website) : <Badge variant="secondary">No answer</Badge>}</dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="text-muted-foreground">Portfolio URL</dt>
                      <dd className="font-medium">{filled(values.portfolio_url) ? trimOrEmpty(values.portfolio_url) : <Badge variant="secondary">No answer</Badge>}</dd>
                    </div>
                  </dl>
                </section>
                <Separator />
                <section className="flex flex-col gap-2" aria-label="Additional information">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold">Additional information</h2>
                    <Button variant="outline" size="sm" type="button" onClick={() => editStep(1)}>
                      <Pencil data-icon="inline-start" />
                      Edit
                    </Button>
                  </div>
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex flex-col">
                      <dt className="text-muted-foreground">Cover letter</dt>
                      <dd className="whitespace-pre-line">{trimOrEmpty(values.cover_letter)}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="text-muted-foreground">Resume</dt>
                      <dd>
                        {resumeFile ? (
                          <span className="font-medium">{trimOrEmpty(values.resume_name)} · {formatSize(values.resume_size)}</span>
                        ) : (
                          <Badge variant="secondary">No answer</Badge>
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            )}

            <div className="flex items-center gap-2">
              {step > 0 && current !== 'review' && (
                <Button variant="ghost" type="button" onClick={goBack}>Back</Button>
              )}
              {current !== 'review' ? (
                <Button type="button" onClick={goNext} disabled={Boolean(stepBlocked)} className="flex-1">
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Sending…' : 'Submit'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
