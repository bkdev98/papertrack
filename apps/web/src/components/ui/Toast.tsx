import { type ReactNode, createContext, use, useCallback, useRef, useState } from 'react'

interface ToastAction {
  label: string
  onClick: () => void
}
interface ToastOptions {
  tone?: 'default' | 'danger'
  action?: ToastAction
  duration?: number
}
interface Toast {
  id: number
  message: string
  tone: 'default' | 'danger'
  action?: ToastAction
}
interface ToastApi {
  /** `opts` may be a tone string (back-compat) or a full options object. */
  show: (message: string, opts?: Toast['tone'] | ToastOptions) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = use(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const show = useCallback((message: string, opts?: Toast['tone'] | ToastOptions) => {
    const o: ToastOptions = typeof opts === 'string' ? { tone: opts } : (opts ?? {})
    const tone = o.tone ?? 'default'
    // Actionable toasts linger longer so there's time to hit the button.
    const duration = o.duration ?? (o.action ? 6000 : 2800)
    const id = ++idRef.current
    setToasts((t) => [...t, { id, message, tone, action: o.action }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration)
  }, [])

  return (
    <ToastContext value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2 pb-[env(safe-area-inset-bottom,0px)] max-sm:w-[calc(100dvw-2rem)]"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-pt-up pointer-events-auto flex items-center gap-3 bg-ink px-4 py-2.5 font-mono text-[11px] tracking-[0.6px] text-paper max-sm:max-w-full"
            style={{
              borderLeft: `3px solid ${t.tone === 'danger' ? '#e0715f' : 'var(--color-seal)'}`,
              boxShadow: '4px 4px 0 rgba(163,56,43,0.5)',
              transform: 'rotate(-0.5deg)',
            }}
          >
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
                className="shrink-0 cursor-pointer font-mono text-[11px] uppercase tracking-[0.5px] text-[#e3b354] underline decoration-[1.5px] underline-offset-2 transition-colors hover:text-paper max-sm:-m-2 max-sm:p-2"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
