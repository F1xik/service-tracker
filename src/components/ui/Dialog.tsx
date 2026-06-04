import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={[
          'flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden',
          'rounded-t-[var(--radius-lg)] border border-[var(--color-border)]',
          'bg-[var(--color-surface)] shadow-[var(--shadow-lg)]',
          'sm:rounded-[var(--radius-lg)]',
        ].join(' ')}
      >
        <div className="flex shrink-0 items-center justify-between p-5 pb-4">
          <h3 className="text-lg font-semibold text-[var(--color-fg)]">{title}</h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}
