import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, normalize, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { api } from './app'
import { env, isProd } from './env'

const app = new Hono()
app.route('/api', api)

// ─── Production: serve the built SPA (dev uses the Vite server) ───────────────
const WEB_DIST = resolve(
  process.env.WEB_DIST_PATH ?? fileURLToPath(new URL('../../web/dist', import.meta.url)),
)

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
}

function ext(p: string): string {
  const i = p.lastIndexOf('.')
  return i < 0 ? '' : p.slice(i)
}

async function tryFile(pathname: string): Promise<{ path: string; type: string } | null> {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.(\/|\\|$))+/, '')
  const path = join(WEB_DIST, rel)
  if (!path.startsWith(WEB_DIST)) return null
  try {
    const s = await stat(path)
    if (s.isFile()) return { path, type: MIME[ext(path)] ?? 'application/octet-stream' }
  } catch {}
  return null
}

if (isProd) {
  app.get('*', async (c) => {
    const hit =
      c.req.path === '/' ? await tryFile('/index.html') : ((await tryFile(c.req.path)) ?? null)
    if (hit) {
      const cache = hit.path.includes(`${'assets'}/`)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache'
      return new Response(Readable.toWeb(createReadStream(hit.path)) as unknown as ReadableStream, {
        headers: { 'Content-Type': hit.type, 'Cache-Control': cache },
      })
    }
    // SPA fallback
    const index = await tryFile('/index.html')
    if (!index) return c.text('Build not found', 404)
    return new Response(Readable.toWeb(createReadStream(index.path)) as unknown as ReadableStream, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  })
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`✓ PaperTrack API on http://localhost:${info.port} (${env.NODE_ENV})`)
})
