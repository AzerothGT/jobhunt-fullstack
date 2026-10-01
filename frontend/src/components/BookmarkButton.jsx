import { Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from 'cn'

export default function BookmarkButton({ bookmarked, disabled, onToggle }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-label={bookmarked ? 'Hapus simpanan' : 'Simpan lowongan'}
      aria-pressed={Boolean(bookmarked)}
    >
      <Bookmark className={cn(bookmarked && 'fill-primary text-primary')} />
    </Button>
  )
}
