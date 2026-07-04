import { type RefObject, useEffect } from 'react'

const FOCUSABLE =
  'a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),' +
  'button:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Lock body scroll, wire Escape-to-close, and — when a container ref is given —
 * make the overlay a proper modal dialog: move focus inside on open, trap Tab
 * within it, and restore focus to the triggering element on close.
 */
export function useOverlay(
  open: boolean,
  onClose: () => void,
  containerRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return
    const container = containerRef?.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    const focusable = (): HTMLElement[] =>
      container
        ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
            (el) => el.offsetParent !== null,
          )
        : []

    // Move focus into the dialog unless a child already claimed it (e.g. autoFocus).
    if (container && !container.contains(document.activeElement)) {
      container.tabIndex = -1
      container.focus()
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !container) return
      const els = focusable()
      if (els.length === 0) {
        e.preventDefault()
        container.focus()
        return
      }
      const first = els[0]
      const last = els[els.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      // Return focus to whatever opened the overlay (WCAG 2.4.3).
      previouslyFocused?.focus?.()
    }
  }, [open, onClose, containerRef])
}
