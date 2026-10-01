import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '../hooks/useAuth.js'

export default function ProfilePage() {
  const { user } = useAuth()
  const role = user.role === 'recruiter' ? 'Perekrut' : 'Pencari kerja'
  const initial = user.name?.trim()?.charAt(0)?.toLocaleUpperCase('id-ID') || 'R'

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Akun Anda</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Profil pribadi.</h1>
        <p className="text-muted-foreground">Informasi dasar yang terhubung dengan akun JobHunt Anda.</p>
      </header>
      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="text-2xl">{initial}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <CardDescription>{role}</CardDescription>
            <CardTitle className="text-2xl">{user.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{user.email}</CardContent>
      </Card>
    </div>
  )
}
