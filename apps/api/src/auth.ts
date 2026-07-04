import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Context, MiddlewareHandler } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'
import { env, isProd } from './env'

const COOKIE = 'pt_session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function sign(payload: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url')
}

/** token = "<issuedAtMs>.<hmac>" */
function makeToken(): string {
  const iat = String(Date.now())
  return `${iat}.${sign(iat)}`
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot < 0) return false
  const iat = token.slice(0, dot)
  const mac = token.slice(dot + 1)
  const expected = sign(iat)
  if (mac.length !== expected.length) return false
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false
  const age = Date.now() - Number(iat)
  return Number.isFinite(age) && age >= 0 && age <= MAX_AGE * 1000
}

/** Constant-time password check. */
export function checkPassword(input: string): boolean {
  const a = Buffer.from(input)
  const b = Buffer.from(env.APP_PASSWORD)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function issueSession(c: Context): void {
  setCookie(c, COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProd,
    path: '/',
    maxAge: MAX_AGE,
  })
}

export function clearSession(c: Context): void {
  setCookie(c, COOKIE, '', {
    httpOnly: true,
    sameSite: 'Lax',
    secure: isProd,
    path: '/',
    maxAge: 0,
  })
}

export function isAuthenticated(c: Context): boolean {
  return verifyToken(getCookie(c, COOKIE))
}

/** Gate for protected routes. */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  if (!isAuthenticated(c)) return c.json({ error: 'Chưa đăng nhập' }, 401)
  await next()
}
