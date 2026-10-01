import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'

export function LoadingState({ label = 'Memuat data…' }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label={label}>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Ada gangguan</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <span>{message || 'Data belum dapat dimuat.'}</span>
        {onRetry && (
          <Button variant="outline" size="sm" type="button" onClick={onRetry}>
            Coba lagi
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

export function EmptyState({ title = 'Belum ada data', children }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {children && <EmptyDescription>{children}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  )
}
