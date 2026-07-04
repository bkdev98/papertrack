import { importBundleSchema } from '@papertrack/shared'
import { asc } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { normalizeBundle } from '../db/convert'
import {
  attachments,
  authors,
  conferences,
  journals,
  papers,
  rewardCategories,
  specialIssues,
} from '../db/schema'
import { applyBundle, seed, withDefaultRewards } from '../db/seed'
import { buildWorkbook } from '../lib/workbook'
import {
  mapAuthor,
  mapConference,
  mapJournal,
  mapPaper,
  mapRewardCategory,
  mapSpecialIssue,
} from '../mappers'
import { storage } from '../storage'

export const dataRouter = new Hono()

/** Full database bundle in the DEFAULT_DB (v3) shape. */
async function buildBundle() {
  const [p, j, conf, si, au, rc] = await Promise.all([
    // Order by kanban position so an export/import round-trip preserves board
    // ordering (import re-derives position from array index).
    db
      .select()
      .from(papers)
      .orderBy(asc(papers.position), asc(papers.id)),
    db.select().from(journals).orderBy(asc(journals.id)),
    db.select().from(conferences).orderBy(asc(conferences.id)),
    db.select().from(specialIssues).orderBy(asc(specialIssues.id)),
    db.select().from(authors).orderBy(asc(authors.id)),
    db.select().from(rewardCategories).orderBy(asc(rewardCategories.id)),
  ])
  return {
    v: 3 as const,
    papers: p.map((row) => {
      const { position, createdAt, updatedAt, ...rest } = mapPaper(row) as any
      return rest
    }),
    journals: j.map(mapJournal),
    conferences: conf.map(mapConference),
    specialIssues: si.map(mapSpecialIssue),
    authors: au.map(mapAuthor),
    rewardCategories: rc.map(mapRewardCategory),
  }
}

dataRouter.get('/inventory', async (c) => {
  const bundle = await buildBundle()
  return c.json({
    papers: bundle.papers.length,
    journals: bundle.journals.length,
    conferences: bundle.conferences.length,
    specialIssues: bundle.specialIssues.length,
    authors: bundle.authors.length,
    rewardCategories: bundle.rewardCategories.length,
  })
})

dataRouter.get('/export', async (c) => {
  const bundle = await buildBundle()
  const date = new Date().toISOString().slice(0, 10)
  c.header('Content-Disposition', `attachment; filename="papertrack-data-${date}.json"`)
  c.header('Content-Type', 'application/json; charset=utf-8')
  return c.body(JSON.stringify(bundle, null, 2))
})

dataRouter.get('/export.xlsx', async (c) => {
  const bundle = await buildBundle()
  const buffer = await buildWorkbook(bundle)
  const date = new Date().toISOString().slice(0, 10)
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="papertrack-data-${date}.xlsx"`,
    },
  })
})

dataRouter.post('/import', async (c) => {
  const raw = await c.req.json().catch(() => null)
  if (!raw) return c.json({ error: 'JSON không hợp lệ' }, 400)
  const parsed = importBundleSchema.safeParse(raw)
  if (!parsed.success) return c.json({ error: 'Cấu trúc dữ liệu không hợp lệ' }, 400)
  // Import is a full replace-all. Guard against wiping everything with a
  // structurally-valid-but-empty bundle (e.g. `{}` or a partial export).
  if (parsed.data.papers.length === 0) {
    return c.json({ error: 'Tệp không chứa bài báo nào — huỷ nhập để tránh xoá sạch dữ liệu' }, 400)
  }
  // Capture existing stored files before the replace so we can drop them once
  // the swap commits (applyBundle deletes the attachment rows).
  const stale = await db.select({ key: attachments.storageKey }).from(attachments)
  const counts = await applyBundle(withDefaultRewards(normalizeBundle(parsed.data)))
  await Promise.allSettled(stale.map((f) => storage.remove(f.key)))
  return c.json({ ok: true, counts })
})

dataRouter.post('/reset', async (c) => {
  // Remove stored files before wiping papers.
  const files = await db.select().from(attachments)
  await Promise.allSettled(files.map((f) => storage.remove(f.storageKey)))
  const counts = await seed()
  return c.json({ ok: true, counts })
})

dataRouter.delete('/clear', async (c) => {
  const files = await db.select().from(attachments)
  await Promise.allSettled(files.map((f) => storage.remove(f.storageKey)))
  await db.transaction(async (tx) => {
    await tx.delete(attachments)
    await tx.delete(papers)
    await tx.delete(authors)
    await tx.delete(journals)
    await tx.delete(conferences)
    await tx.delete(specialIssues)
    // reward_categories are preserved (regulation reference data).
  })
  return c.json({ ok: true })
})
