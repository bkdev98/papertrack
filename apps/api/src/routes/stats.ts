import {
  type Paper,
  computeDeadlines,
  computeOverview,
  computeSettlement,
  daysSince,
} from '@papertrack/shared'
import { Hono } from 'hono'
import { loadAll } from '../lib/load'

export const statsRouter = new Hono()

statsRouter.get('/overview', async (c) => {
  const { papers: ps, conferences: conf, specialIssues: si, rewardCategories: rc } = await loadAll()
  const stats = computeOverview(ps, rc)
  const deadlines = computeDeadlines(conf, si).filter((d) => d.days >= 0)
  return c.json({ stats, deadlines })
})

statsRouter.get('/settlement', async (c) => {
  const { papers: ps, rewardCategories: rc } = await loadAll()
  return c.json(computeSettlement(ps, rc))
})

statsRouter.get('/notifications', async (c) => {
  const { papers: ps, conferences: conf, specialIssues: si, rewardCategories: rc } = await loadAll()
  const deadlines = computeDeadlines(conf, si)
  const ref = (p: Paper) => ({ id: p.id, title: p.title, venue: p.venue })

  const urgent = deadlines.filter((d) => d.urgent)
  const soon = deadlines.filter((d) => d.warn)
  const accepted = ps.filter((p) => p.status === 'Chấp nhận').map(ref)
  const watch = ps
    .filter((p) => p.status === 'Đang phản biện' && (daysSince(p.date) ?? 0) > 75)
    .map((p) => ({ ...ref(p), days: daysSince(p.date) ?? 0 }))

  const settle = computeSettlement(ps, rc)
  const settleDue = Object.entries(settle.authors)
    .filter(([, v]) => v.pend !== 0)
    .map(([author, v]) => ({ author, pend: v.pend }))

  return c.json({ urgent, remind: { accepted, soon, settle: settleDue }, watch })
})
