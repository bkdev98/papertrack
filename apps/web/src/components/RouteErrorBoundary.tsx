import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Catches render/lazy-import failures so a missing chunk (e.g. a stale tab after
 * a redeploy requests a hash that no longer exists) shows a recoverable prompt
 * instead of unmounting the whole tree to a blank screen.
 */
export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Route render failed:', error, info.componentStack)
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <span className="font-display text-[22px] text-ink">Trang gặp trục trặc</span>
        <p className="max-w-sm font-serif text-[14px] italic text-muted">
          Có thể sổ vừa được cập nhật. Tải lại để lấy phiên bản mới nhất.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="cursor-pointer border-[1.5px] border-ink px-4 py-1.5 max-sm:min-h-[44px] max-sm:px-5 font-mono text-[10px] uppercase tracking-[1.4px] text-ink transition-colors hover:bg-ink hover:text-paper [border-radius:3px/7px]"
        >
          Tải lại trang
        </button>
      </div>
    )
  }
}
