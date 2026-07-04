import type { Context } from 'hono'

/**
 * Tiny in-memory fixed-window limiter for the single shared-password login.
 * Adequate for a single-instance internal tool; swap for a shared store if the
 * API is ever scaled horizontally.
 */
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const MAX_FAILS = 8
const MAX_TRACKED = 5000 // guard against unbounded growth from IP rotation

type Attempt = { count: number; first: number }
const attempts = new Map<string, Attempt>()

/** Best-effort client IP: trust the proxy's first X-Forwarded-For hop, else fall back. */
export function clientIp(c: Context): string {
  const xff = c.req.header('x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return c.req.header('x-real-ip') ?? 'local'
}

function prune(now: number): void {
  for (const [ip, rec] of attempts) {
    if (now - rec.first > WINDOW_MS) attempts.delete(ip)
  }
}

/** True when this IP has exhausted its failed-attempt budget for the window. */
export function isLockedOut(ip: string): boolean {
  const rec = attempts.get(ip)
  if (!rec) return false
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(ip)
    return false
  }
  return rec.count >= MAX_FAILS
}

export function recordFailure(ip: string): void {
  const now = Date.now()
  if (attempts.size > MAX_TRACKED) prune(now)
  const rec = attempts.get(ip)
  if (!rec || now - rec.first > WINDOW_MS) attempts.set(ip, { count: 1, first: now })
  else rec.count += 1
}

export function recordSuccess(ip: string): void {
  attempts.delete(ip)
}
