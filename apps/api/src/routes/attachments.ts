import { Readable } from 'node:stream'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { attachments } from '../db/schema'
import { storage } from '../storage'

export const attachmentsRouter = new Hono()

// Only these MIME types are safe to render inline; the browser won't execute
// script from them. Anything else (notably text/html and image/svg+xml, which
// can run script same-origin) is forced to download as an opaque octet-stream.
const INLINE_SAFE = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])

attachmentsRouter.get('/:id{[0-9]+}/download', async (c) => {
  const id = Number(c.req.param('id'))
  const [row] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1)
  if (!row) return c.json({ error: 'Không tìm thấy tệp' }, 404)

  const url = await storage.url(row.storageKey, row.filename)
  if (url) return c.redirect(url)

  const obj = await storage.read(row.storageKey)
  if (!obj) return c.json({ error: 'Tệp không còn tồn tại' }, 404)

  const inline = INLINE_SAFE.has(row.contentType)
  const disposition = inline ? 'inline' : 'attachment'
  const contentType = inline ? row.contentType : 'application/octet-stream'
  return new Response(Readable.toWeb(obj.stream) as unknown as ReadableStream, {
    headers: {
      'Content-Type': contentType,
      // Never let the browser sniff a safer-looking type into an executable one.
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
    },
  })
})

attachmentsRouter.delete('/:id{[0-9]+}', async (c) => {
  const id = Number(c.req.param('id'))
  const [row] = await db.delete(attachments).where(eq(attachments.id, id)).returning()
  if (!row) return c.json({ error: 'Không tìm thấy tệp' }, 404)
  await storage.remove(row.storageKey).catch(() => {})
  return c.json({ ok: true, id })
})
