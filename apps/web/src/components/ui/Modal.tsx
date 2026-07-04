import { useOverlay } from '@/lib/useOverlay'
import { usePresence } from '@/lib/usePresence'
import { cn } from '@/lib/utils'
import { type ReactNode, useRef } from 'react'
import { createPortal } from 'react-dom'

export function Modal({
  open,
  onClose,
  children,
  maxWidth = 880,
  label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: number
  label?: string
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const { mounted, exiting } = usePresence(open, 350)
  useOverlay(open, onClose, dialogRef)
  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-6 sm:p-10">
      <div
        className={cn(
          'fixed inset-0 bg-[rgba(34,29,20,0.35)]',
          exiting ? 'animate-pt-fade-out' : 'animate-pt-fade',
        )}
        style={{ animationDuration: '0.25s' }}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className={cn(
          'paper-texture-note relative my-auto w-full outline-none',
          exiting ? 'animate-pt-up-out' : 'animate-pt-up',
        )}
        style={{
          maxWidth,
          boxShadow: '0 24px 70px rgba(34,29,20,0.4)',
          animationDuration: exiting ? '0.3s' : '0.35s',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function ModalHeader({
  title,
  sub,
  right,
  onClose,
  size = 'lg',
}: {
  title: ReactNode
  sub?: ReactNode
  right?: ReactNode
  onClose: () => void
  /** 'lg' = paper modal (25px title), 'sm' = catalog modal (21px title). */
  size?: 'lg' | 'sm'
}) {
  const sm = size === 'sm'
  return (
    <div className="px-7 pt-6">
      <div className="flex items-baseline gap-3">
        <span className={cn('text-seal', sm ? 'text-[17px]' : 'text-[20px]')}>❧</span>
        <h2
          className={cn(
            'font-serif font-semibold italic leading-none text-ink',
            sm ? 'text-[21px] tracking-[-0.2px]' : 'text-[25px] tracking-[-0.3px]',
          )}
        >
          {title}
        </h2>
        {sub && (
          <span
            className={cn('font-serif italic text-muted', sm ? 'text-[12px]' : 'text-[12.5px]')}
          >
            {sub}
          </span>
        )}
        <div className="ml-auto flex items-center gap-4">
          {right}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="cursor-pointer text-[16px] text-muted transition-colors hover:text-seal"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="double-rule mt-4" />
    </div>
  )
}

export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-7 py-6', className)}>{children}</div>
}

export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 border-t border-rule px-7 py-4', className)}>
      {children}
    </div>
  )
}
