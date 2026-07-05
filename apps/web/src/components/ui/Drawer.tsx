import { useOverlay } from '@/lib/useOverlay'
import { usePresence } from '@/lib/usePresence'
import { cn } from '@/lib/utils'
import { type ReactNode, useRef } from 'react'
import { createPortal } from 'react-dom'

export function Drawer({
  open,
  onClose,
  children,
  width = 440,
  label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: number
  label?: string
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const { mounted, exiting } = usePresence(open, 320)
  useOverlay(open, onClose, dialogRef)
  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          'absolute inset-0 bg-[rgba(34,29,20,0.25)]',
          exiting ? 'animate-pt-fade-out' : 'animate-pt-fade',
        )}
        style={{ animationDuration: '0.25s' }}
        onClick={onClose}
      />
      <aside
        ref={dialogRef}
        className={cn(
          'absolute right-0 top-0 flex h-full flex-col border-l border-ink bg-paper-drawer outline-none',
          exiting ? 'animate-pt-panel-out' : 'animate-pt-panel',
        )}
        style={{ width, maxWidth: '100dvw', boxShadow: '-12px 0 40px rgba(34,29,20,0.22)' }}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </aside>
    </div>,
    document.body,
  )
}

export function DrawerHeader({
  tab,
  sub,
  right,
  onClose,
  onBack,
}: {
  tab: ReactNode
  sub?: ReactNode
  /** Optional controls rendered just before the close button (e.g. "clear"). */
  right?: ReactNode
  onClose: () => void
  /** When set, this drawer is stacked over a parent — show a back affordance. */
  onBack?: () => void
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line bg-paper-head max-sm:px-4 px-5 py-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại"
          className="-ml-1 flex shrink-0 cursor-pointer items-center gap-1 border-r border-rule pr-3 font-mono text-[9.5px] uppercase tracking-[1.2px] text-muted transition-colors hover:text-seal max-sm:-my-2 max-sm:py-2"
        >
          <span className="text-[14px] leading-none">‹</span>
          Quay lại
        </button>
      )}
      <span className="font-mono text-[9.5px] uppercase tracking-[1.8px] text-ink">{tab}</span>
      {sub && <span className="font-serif text-[12px] italic text-muted">{sub}</span>}
      <div className="ml-auto flex items-center gap-3">
        {right}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="cursor-pointer text-[16px] text-muted transition-colors hover:text-seal max-sm:-m-2 max-sm:p-2"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export function DrawerBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex-1 overflow-y-auto max-sm:px-4 px-6 py-5', className)}>{children}</div>
  )
}

export function DrawerFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-rule bg-paper-head/60 max-sm:px-4 px-6 py-4">
      {children}
    </div>
  )
}
