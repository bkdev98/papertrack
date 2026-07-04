import { zValidator } from '@hono/zod-validator'
import { loginSchema } from '@papertrack/shared'
import { Hono } from 'hono'
import { checkPassword, clearSession, isAuthenticated, issueSession } from '../auth'
import { clientIp, isLockedOut, recordFailure, recordSuccess } from '../lib/rate-limit'

export const authRouter = new Hono()

authRouter.get('/me', (c) => c.json({ authenticated: isAuthenticated(c) }))

authRouter.post('/login', zValidator('json', loginSchema), (c) => {
  const ip = clientIp(c)
  if (isLockedOut(ip)) {
    return c.json({ error: 'Quá nhiều lần thử — vui lòng đợi ít phút' }, 429)
  }
  const { password } = c.req.valid('json')
  if (!checkPassword(password)) {
    recordFailure(ip)
    return c.json({ error: 'Mật khẩu chưa đúng' }, 401)
  }
  recordSuccess(ip)
  issueSession(c)
  return c.json({ ok: true })
})

authRouter.post('/logout', (c) => {
  clearSession(c)
  return c.json({ ok: true })
})
