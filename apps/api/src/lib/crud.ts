import { zValidator } from '@hono/zod-validator'
import { asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { z } from 'zod'
import { db } from '../db/client'

interface CrudOptions<Row> {
  table: any
  schema: z.ZodTypeAny
  map: (row: Row) => unknown
  /** Column to order the list by (defaults to id). */
  orderBy?: any
  /** Called after create/update/delete to let callers invalidate caches, etc. */
  onChange?: () => void
}

/** Standard list/read/create/update/delete for a simple catalog table. */
export function crudRoutes<Row extends { id: number }>(opts: CrudOptions<Row>) {
  const { table, schema, map, orderBy } = opts
  const r = new Hono()

  r.get('/', async (c) => {
    const rows = (await db
      .select()
      .from(table)
      .orderBy(orderBy ?? asc(table.id))) as Row[]
    return c.json(rows.map(map))
  })

  r.get('/:id{[0-9]+}', async (c) => {
    const id = Number(c.req.param('id'))
    const [row] = (await db.select().from(table).where(eq(table.id, id)).limit(1)) as Row[]
    if (!row) return c.json({ error: 'Không tìm thấy' }, 404)
    return c.json(map(row))
  })

  r.post('/', zValidator('json', schema), async (c) => {
    const data = c.req.valid('json' as never)
    const [row] = (await db
      .insert(table)
      .values(data as any)
      .returning()) as Row[]
    opts.onChange?.()
    return c.json(map(row as Row), 201)
  })

  r.patch('/:id{[0-9]+}', async (c) => {
    const id = Number(c.req.param('id'))
    const partial = (schema as any).partial()
    const parsed = partial.safeParse(await c.req.json().catch(() => ({})))
    if (!parsed.success)
      return c.json({ error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten() }, 400)
    // An empty patch would make drizzle's .set({}) throw — treat it as a no-op
    // and just return the current row (404 if it doesn't exist).
    if (Object.keys(parsed.data as object).length === 0) {
      const [existing] = (await db.select().from(table).where(eq(table.id, id)).limit(1)) as Row[]
      if (!existing) return c.json({ error: 'Không tìm thấy' }, 404)
      return c.json(map(existing))
    }
    const [row] = (await db
      .update(table)
      .set(parsed.data as any)
      .where(eq(table.id, id))
      .returning()) as Row[]
    if (!row) return c.json({ error: 'Không tìm thấy' }, 404)
    opts.onChange?.()
    return c.json(map(row))
  })

  r.delete('/:id{[0-9]+}', async (c) => {
    const id = Number(c.req.param('id'))
    const [row] = (await db.delete(table).where(eq(table.id, id)).returning()) as Row[]
    if (!row) return c.json({ error: 'Không tìm thấy' }, 404)
    opts.onChange?.()
    return c.json({ ok: true, id })
  })

  return r
}
