import { Check } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Toaster } from '@/components/ui/sonner'
import { cn } from 'cn'
import { useAuth } from '../hooks/useAuth.js'

const ROLE_OPTIONS = [
  { value: 'job_seeker', label: 'Pencari kerja', landing: '/jobs' },
  { value: 'recruiter', label: 'Recruiter', landing: '/dashboard' },
]

function navLinkClass({ isActive }) {
  return cn(buttonVariants({ variant: 'ghost', size: 'sm' }), isActive && 'bg-muted text-foreground', !isActive && 'text-muted-foreground')
}

export default function SiteLayout() {
  const { user, logout, switchToRole } = useAuth()
  const navigate = useNavigate()

  function signOut() {
    logout()
    navigate('/')
  }

  async function changeRole(option) {
    if (user?.role === option.value) return
    try {
      await switchToRole(option.value)
      toast.success(`Mode ${option.label.toLowerCase()} aktif.`)
      navigate(option.landing)
    } catch {
      toast.error('Gagal beralih peran.')
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
          <Link
            to="/"
            aria-label="JobHunt, beranda"
            className={cn(buttonVariants({ variant: 'ghost' }), 'px-2 text-lg font-bold tracking-tight')}
          >
            job/hunt
          </Link>
          <nav className="flex items-center gap-1" aria-label="Navigasi utama">
            <NavLink to="/jobs" className={navLinkClass}>Lowongan</NavLink>
            {user?.role === 'job_seeker' && (
              <NavLink to="/applications" className={navLinkClass}>Lamaran saya</NavLink>
            )}
            {user?.role === 'job_seeker' && (
              <NavLink to="/bookmarks" className={navLinkClass}>Tersimpan</NavLink>
            )}
            {user?.role === 'recruiter' && (
              <NavLink to="/dashboard" className={navLinkClass}>Dasbor recruiter</NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium outline-none select-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
                  <Avatar className="size-6">
                    <AvatarFallback>{user.name?.trim()?.charAt(0)?.toUpperCase() || 'J'}</AvatarFallback>
                  </Avatar>
                  <span className="max-w-28 truncate">{user.name}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem render={<Link to="/profile" />}>Profil</DropdownMenuItem>
                    <DropdownMenuItem onClick={signOut}>Keluar</DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="flex items-center gap-2">
                    Mode
                    <Badge variant="secondary">{user.role === 'recruiter' ? 'Recruiter' : 'Pencari kerja'}</Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuGroup>
                    {ROLE_OPTIONS.map((option) => (
                      <DropdownMenuItem key={option.value} onClick={() => changeRole(option)}>
                        {user.role === option.value && <Check />}
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>Masuk</Link>
                <Link to="/register" className={cn(buttonVariants({ size: 'sm' }))}>Daftar</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8"><Outlet /></main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="w-fit font-bold text-foreground">job/hunt</Link>
          <p>Job Seeker menemukan kerja, Recruiter menemukan kandidat.</p>
        </div>
      </footer>
      <Toaster />
    </div>
  )
}
