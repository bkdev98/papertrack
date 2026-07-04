import { zValidator } from '@hono/zod-validator'
import { dashboardNoteInputSchema } from '@papertrack/shared'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { dashboardNote } from '../db/schema'
import { mapDashboardNote } from '../mappers'

// The sticky note is a singleton — one row, id pinned to 1.
const NOTE_ID = 1

export const noteRouter = new Hono()

noteRouter.get('/', async (c) => {
  const [row] = await db.select().from(dashboardNote).where(eq(dashboardNote.id, NOTE_ID)).limit(1)
  return c.json(row ? mapDashboardNote(row) : { body: '', sign: '', updatedAt: '' })
})

noteRouter.put('/', zValidator('json', dashboardNoteInputSchema), async (c) => {
  const { body, sign } = c.req.valid('json' as never) as { body: string; sign: string }
  const [row] = await db
    .insert(dashboardNote)
    .values({ id: NOTE_ID, body, sign, updatedAt: new Date() })
    .onConflictDoUpdate({ target: dashboardNote.id, set: { body, sign, updatedAt: new Date() } })
    .returning()
  if (!row) return c.json({ error: 'Không lưu được ghi chú' }, 500)
  return c.json(mapDashboardNote(row))
})
