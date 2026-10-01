import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
import { useAuth } from '../hooks/useAuth.js'

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { login, register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [role, setRole] = useState('job_seeker')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values = Object.fromEntries(form.entries())
    if (isRegister) values.role = role
    setError('')
    setSubmitting(true)
    try {
      const user = isRegister ? await register(values) : await login(values)
      const queryReturn = new URLSearchParams(location.search).get('returnTo')
      const stateReturn = location.state?.from?.pathname
      const returnTo = queryReturn || stateReturn
      const safeReturn = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null
      navigate(safeReturn || (user.role === 'recruiter' ? '/dashboard' : '/jobs'), { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-8">
      <div className="flex flex-col gap-1 text-center">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Akun JobHunt</p>
        <h1 className="text-3xl font-bold tracking-tight">{isRegister ? 'Buat akun.' : 'Masuk ke akun.'}</h1>
        <p className="text-sm text-muted-foreground">
          {isRegister ? 'Pilih bagaimana Anda ingin menggunakan JobHunt.' : 'Lanjutkan perjalanan Anda dari sini.'}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{isRegister ? 'Daftar' : 'Masuk'}</CardTitle>
          <CardDescription>
            {isRegister ? 'Satu langkah kecil menuju pekerjaan yang lebih berarti.' : 'Tempat yang baik untuk bekerja dimulai dengan pencarian yang baik.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FieldGroup>
              {isRegister && (
                <Field>
                  <FieldLabel htmlFor="name">Nama lengkap</FieldLabel>
                  <Input id="name" name="name" autoComplete="name" required maxLength="120" />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  minLength={isRegister ? 8 : undefined}
                />
                {isRegister && <FieldDescription>Gunakan minimal 8 karakter.</FieldDescription>}
              </Field>
              {isRegister && (
                <Field>
                  <FieldLabel htmlFor="role">Saya ingin</FieldLabel>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="job_seeker">Mencari pekerjaan</SelectItem>
                        <SelectItem value="recruiter">Merekrut kandidat</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </FieldGroup>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Mohon tunggu…' : isRegister ? 'Buat akun' : 'Masuk'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
        <Button variant="link" size="sm" render={<Link to={isRegister ? '/login' : '/register'} />} className="p-0">
          {isRegister ? 'Masuk' : 'Daftar sekarang'}
        </Button>
      </p>
    </div>
  )
}
