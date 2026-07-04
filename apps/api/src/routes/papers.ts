import { randomUUID } from 'node:crypto'
import { zValidator } from '@hono/zod-validator'
import {
  type Status,
  moveSchema,
  nextStatus,
  paperInputSchema,
  paperPatchSchema,
  paymentRecordSchema,
} from '@papertrack/shared'
import { asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { type Context, Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { z } from 'zod'
import { db } from '../db/client'
import { attachments, papers } from '../db/schema'
import { mapAttachment, mapPaper } from '../mappers'
import { storage } from '../storage'

export const papersRouter = new Hono()

const today = () => new Date().toISOString().slice(0, 10)

// Base shape for the fin jsonb, used to coalesce nulls inside atomic SQL updates.
const DEFAULT_FIN_JSON = '{"shares":{},"paid":{},"rewardReceived":false,"rewardDate":""}'

/** Unwrap the single row a mutation/aggregate is expected to return. */
function need<T>(rows: T[]): T {
  const r = rows[0]
  if (r === undefined) throw new Error('Expected a row')
  return r
}

async function getPaper(id: number) {
  const [row] = await db.select().from(papers).where(eq(papers.id, id)).limit(1)
  return row ?? null
}

async function maxPosition(): Promise<number> {
  const agg = need(
    await db.select({ max: sql<number>`coalesce(max(${papers.position}), 0)` }).from(papers),
  )
  return Number(agg.max)
}

/** Record the transition time for a status the paper is entering. */
function withHistory(history: Record<string, string>, status: Status): Record<string, string> {
  return { ...history, [status]: today() }
}

// ─── List ────────────────────────────────────────────────────────────────────
papersRouter.get('/', async (c) => {
  const rows = await db.select().from(papers).orderBy(asc(papers.position), asc(papers.id))
  return c.json(rows.map(mapPaper))
})

// ─── Read one (+ attachments) ─────────────────────────────────────────────────
papersRouter.get('/:id{[0-9]+}', async (c) => {
  const id = Number(c.req.param('id'))
  const row = await getPaper(id)
  if (!row) return c.json({ error: 'Không tìm thấy hồ sơ' }, 404)
  const files = await db
    .select()
    .from(attachments)
    .where(eq(attachments.paperId, id))
    .orderBy(desc(attachments.createdAt))
  return c.json({ ...mapPaper(row), attachments: files.map(mapAttachment) })
})

// ─── Create ────────────────────────────────────────────────────────────────────
papersRouter.post('/', zValidator('json', paperInputSchema), async (c) => {
  const data = c.req.valid('json')
  const date = data.date || today()
  const row = need(
    await db
      .insert(papers)
      .values({
        ...data,
        date,
        fin: data.fin ?? null,
        history: { ...data.history, [data.status]: data.history?.[data.status] ?? date },
        position: (await maxPosition()) + 1,
      })
      .returning(),
  )
  return c.json(mapPaper(row), 201)
})

// ─── Update ────────────────────────────────────────────────────────────────────
papersRouter.patch('/:id{[0-9]+}', zValidator('json', paperPatchSchema), async (c) => {
  const id = Number(c.req.param('id'))
  const patch = c.req.valid('json')
  const current = await getPaper(id)
  if (!current) return c.json({ error: 'Không tìm thấy hồ sơ' }, 404)

  const nextHistory =
    patch.status && patch.status !== current.status
      ? withHistory(current.history ?? {}, patch.status)
      : undefined

  const updated = need(
    await db
      .update(papers)
      .set({ ...patch, ...(nextHistory ? { history: nextHistory } : {}), updatedAt: new Date() })
      .where(eq(papers.id, id))
      .returning(),
  )
  return c.json(mapPaper(updated))
})

// ─── Delete (with its stored files) ────────────────────────────────────────────
papersRouter.delete('/:id{[0-9]+}', async (c) => {
  const id = Number(c.req.param('id'))
  const files = await db.select().from(attachments).where(eq(attachments.paperId, id))
  await Promise.allSettled(files.map((f) => storage.remove(f.storageKey)))
  const [row] = await db.delete(papers).where(eq(papers.id, id)).returning()
  if (!row) return c.json({ error: 'Không tìm thấy hồ sơ' }, 404)
  return c.json({ ok: true, id })
})

// ─── Kanban move (status + fractional position) ────────────────────────────────
papersRouter.post('/:id{[0-9]+}/move', zValidator('json', moveSchema), async (c) => {
  const id = Number(c.req.param('id'))
  const { status, beforeId, afterId } = c.req.valid('json')
  const current = await getPaper(id)
  if (!current) return c.json({ error: 'Không tìm thấy hồ sơ' }, 404)

  const neighborIds = [beforeId, afterId].filter((n): n is number => typeof n === 'number')
  const neighbors = neighborIds.length
    ? await db
        .select({ id: papers.id, position: papers.position })
        .from(papers)
        .where(inArray(papers.id, neighborIds))
    : []
  const posOf = (n?: number | null) =>
    n == null ? null : (neighbors.find((x) => x.id === n)?.position ?? null)
  const above = posOf(beforeId)
  const below = posOf(afterId)

  let position: number
  if (above != null && below != null) position = (above + below) / 2
  else if (below != null) position = below - 1
  else if (above != null) position = above + 1
  else position = (await maxPosition()) + 1

  const history =
    status !== current.status ? withHistory(current.history ?? {}, status) : (current.history ?? {})

  // Fast path: a representable midpoint exists between the two neighbors.
  if (!(above != null && below != null && !(position > above && position < below))) {
    const updated = need(
      await db
        .update(papers)
        .set({ status, position, history, updatedAt: new Date() })
        .where(eq(papers.id, id))
        .returning(),
    )
    return c.json(mapPaper(updated))
  }

  // Slow path: the fractional gap collapsed (float64 precision exhausted after
  // repeated inserts into the same slot). Renumber the destination column to
  // clean integer spacing, placing the moved card exactly between its neighbors.
  const REBALANCE_STEP = 1000
  const updated = await db.transaction(async (tx) => {
    const order = (
      await tx
        .select({ id: papers.id })
        .from(papers)
        .where(eq(papers.status, status))
        .orderBy(asc(papers.position), asc(papers.id))
    )
      .map((r) => r.id)
      .filter((x) => x !== id)
    let at = order.length
    if (beforeId != null && order.includes(beforeId)) at = order.indexOf(beforeId) + 1
    else if (afterId != null && order.includes(afterId)) at = order.indexOf(afterId)
    else if (beforeId == null) at = 0
    order.splice(at, 0, id)
    for (const [i, pid] of order.entries()) {
      const pos = (i + 1) * REBALANCE_STEP
      await tx
        .update(papers)
        .set(
          pid === id
            ? { status, position: pos, history, updatedAt: new Date() }
            : { position: pos },
        )
        .where(eq(papers.id, pid))
    }
    return need(await tx.select().from(papers).where(eq(papers.id, id)).limit(1))
  })
  return c.json(mapPaper(updated))
})

// ─── Advance / reject / restore ────────────────────────────────────────────────
async function setStatus(id: number, status: Status, c: Context) {
  const current = await getPaper(id)
  if (!current) return c.json({ error: 'Không tìm thấy hồ sơ' }, 404)
  const updated = need(
    await db
      .update(papers)
      .set({ status, history: withHistory(current.history ?? {}, status), updatedAt: new Date() })
      .where(eq(papers.id, id))
      .returning(),
  )
  return c.json(mapPaper(updated))
}

papersRouter.post('/:id{[0-9]+}/advance', async (c) => {
  const id = Number(c.req.param('id'))
  const current = await getPaper(id)
  if (!current) return c.json({ error: 'Không tìm thấy hồ sơ' }, 404)
  const next = nextStatus(current.status as Status)
  if (!next) return c.json({ error: 'Không thể chuyển bước' }, 400)
  return setStatus(id, next, c)
})

papersRouter.post('/:id{[0-9]+}/reject', (c) => setStatus(Number(c.req.param('id')), 'Từ chối', c))
papersRouter.post('/:id{[0-9]+}/restore', (c) => setStatus(Number(c.req.param('id')), 'Nộp bài', c))

// ─── Settlement: record a payment / toggle reward received ─────────────────────
papersRouter.post('/:id{[0-9]+}/settle/pay', zValidator('json', paymentRecordSchema), async (c) => {
  const id = Number(c.req.param('id'))
  const { author, amount, date } = c.req.valid('json')
  const current = await getPaper(id)
  if (!current) return c.json({ error: 'Không tìm thấy hồ sơ' }, 404)
  // Update only this author's entry inside fin.paid, in SQL, so a concurrent
  // settle/reward (or a pay for another author) can't clobber the whole blob.
  const paidExpr =
    amount === 0
      ? sql`coalesce(${papers.fin}->'paid', '{}'::jsonb) - ${author}`
      : sql`coalesce(${papers.fin}->'paid', '{}'::jsonb) || jsonb_build_object(${author}::text, ${JSON.stringify({ amount, date: date || today() })}::jsonb)`
  const updated = need(
    await db
      .update(papers)
      .set({
        fin: sql`jsonb_set(coalesce(${papers.fin}, ${DEFAULT_FIN_JSON}::jsonb), '{paid}', ${paidExpr}, true)`,
        updatedAt: new Date(),
      })
      .where(eq(papers.id, id))
      .returning(),
  )
  return c.json(mapPaper(updated))
})

papersRouter.post(
  '/:id{[0-9]+}/settle/reward',
  zValidator('json', z.object({ received: z.boolean() })),
  async (c) => {
    const id = Number(c.req.param('id'))
    const { received } = c.req.valid('json')
    const current = await getPaper(id)
    if (!current) return c.json({ error: 'Không tìm thấy hồ sơ' }, 404)
    // Merge only the reward keys, in SQL, so a concurrent settle/pay is preserved.
    const updated = need(
      await db
        .update(papers)
        .set({
          fin: sql`coalesce(${papers.fin}, ${DEFAULT_FIN_JSON}::jsonb) || jsonb_build_object('rewardReceived', ${received}::boolean, 'rewardDate', ${received ? today() : ''}::text)`,
          updatedAt: new Date(),
        })
        .where(eq(papers.id, id))
        .returning(),
    )
    return c.json(mapPaper(updated))
  },
)

// ─── Attachments ───────────────────────────────────────────────────────────────
papersRouter.get('/:id{[0-9]+}/attachments', async (c) => {
  const id = Number(c.req.param('id'))
  const files = await db
    .select()
    .from(attachments)
    .where(eq(attachments.paperId, id))
    .orderBy(desc(attachments.createdAt))
  return c.json(files.map(mapAttachment))
})

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
// Reject oversized bodies while streaming, before parseBody() buffers the whole
// request into memory (add ~1MB headroom for multipart framing overhead).
const uploadLimit = bodyLimit({
  maxSize: MAX_UPLOAD_BYTES + 1024 * 1024,
  onError: (c) => c.json({ error: 'Tệp quá lớn (tối đa 50MB)' }, 413),
})

papersRouter.post('/:id{[0-9]+}/attachments', uploadLimit, async (c) => {
  const id = Number(c.req.param('id'))
  const current = await getPaper(id)
  if (!current) return c.json({ error: 'Không tìm thấy hồ sơ' }, 404)

  const body = await c.req.parseBody()
  const file = body.file
  if (!(file instanceof File)) return c.json({ error: 'Thiếu tệp đính kèm' }, 400)
  if (file.size > MAX_UPLOAD_BYTES) return c.json({ error: 'Tệp quá lớn (tối đa 50MB)' }, 413)

  const buffer = Buffer.from(await file.arrayBuffer())
  const safeName = file.name.replace(/[^\w.\- ]+/g, '_')
  const key = `papers/${id}/${randomUUID()}-${safeName}`
  await storage.put(key, buffer, file.type || 'application/octet-stream')

  const saved = need(
    await db
      .insert(attachments)
      .values({
        paperId: id,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        storageKey: key,
      })
      .returning(),
  )
  return c.json(mapAttachment(saved), 201)
})
