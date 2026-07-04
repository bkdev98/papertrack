import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { isAuthenticated } from './auth'
import { env, isProd } from './env'
import { aiRouter } from './routes/ai'
import { attachmentsRouter } from './routes/attachments'
import { authRouter } from './routes/auth'
import { catalog } from './routes/catalog'
import { dataRouter } from './routes/data'
import { noteRouter } from './routes/note'
import { papersRouter } from './routes/papers'
import { statsRouter } from './routes/stats'

export const api = new Hono()

if (!isProd) api.use('*', logger())
api.use('*', cors({ origin: env.WEB_ORIGIN, credentials: true }))

// Auth gate — everything under /api requires a session except auth + health.
api.use('*', async (c, next) => {
  const p = c.req.path
  if (p === '/api/health' || p.startsWith('/api/auth/')) return next()
  if (!isAuthenticated(c)) return c.json({ error: 'Chưa đăng nhập' }, 401)
  return next()
})

api.get('/health', (c) => c.json({ ok: true }))
api.route('/auth', authRouter)
api.route('/papers', papersRouter)
api.route('/attachments', attachmentsRouter)
api.route('/stats', statsRouter)
api.route('/note', noteRouter)
api.route('/ai', aiRouter)
api.route('/data', dataRouter)
api.route('/', catalog) // /authors, /journals, /conferences, /special-issues, /reward-categories

api.onError((err, c) => {
  console.error('API error:', err)
  return c.json({ error: 'Lỗi máy chủ' }, 500)
})
