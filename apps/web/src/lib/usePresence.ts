import { useEffect, useState } from 'react'

/**
 * Keeps an overlay mounted through its exit animation. Returns `mounted` (true
 * while entering, present, or exiting) and `exiting` (true once `open` flips to
 * false, until `exitMs` elapses). Reopening mid-exit cancels the unmount.
 */
export function usePresence(open: boolean, exitMs: number): { mounted: boolean; exiting: boolean } {
  const [mounted, setMounted] = useState(open)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setExiting(false)
      return
    }
    if (!mounted) return
    setExiting(true)
    const t = window.setTimeout(() => {
      setMounted(false)
      setExiting(false)
    }, exitMs)
    return () => window.clearTimeout(t)
  }, [open, mounted, exitMs])

  return { mounted, exiting }
}
