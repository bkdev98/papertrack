import { zValidator } from '@hono/zod-validator'
import {
  type DashboardNote,
  type Deadline,
  type OverviewStats,
  type Paper,
  type PaperDraft,
  composeNudge,
  computeDeadlines,
  computeOverview,
  computeSettlement,
  daysSince,
  money,
  paperTotal,
  rewardEligible,
  statusGroup,
} from '@papertrack/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { useAI } from '../env'
import {
  type AskMessage,
  type BriefingSignals,
  askLedger,
  extractPaperFromText,
  generateBriefingNote,
  suggestRank,
} from '../lib/ai'
import { extractDoi, fetchCrossref } from '../lib/crossref'
import { loadAll } from '../lib/load'

export const aiRouter = new Hono()

type BriefingResponse = DashboardNote & { source: 'ai' | 'fallback' }

// A paper is "stuck in review" past the same threshold the notifications use.
const LONG_REVIEW_DAYS = 75
// How long a generated note is reused while its signals are unchanged.
const CACHE_TTL_MS = 10 * 60 * 1000

/** Shorten a venue/issue name to its trailing "(ACRONYM)" or a clipped form. */
function shortName(name: string): string {
  const acronym = name.match(/\(([^)]{2,24})\)\s*$/)
  if (acronym?.[1]) return acronym[1]
  return name.length > 42 ? `${name.slice(0, 40).trimEnd()}…` : name
}

function buildSignals(
  overview: OverviewStats,
  deadlines: Deadline[],
  papers: Paper[],
): BriefingSignals {
  const upcoming = deadlines.filter((d) => d.days >= 0).sort((a, b) => a.days - b.days)
  const longReview = papers
    .filter((p) => p.status === 'Đang phản biện' && (daysSince(p.date) ?? 0) > LONG_REVIEW_DAYS)
    .map((p) => ({ title: p.title.slice(0, 60), venue: p.venue, days: daysSince(p.date) ?? 0 }))
    .sort((a, b) => b.days - a.days)
    .slice(0, 4)

  return {
    today: new Date().toISOString().slice(0, 10),
    totals: {
      total: overview.total,
      published: overview.published,
      q12: overview.q12,
      inproc: overview.inprocCount,
      finished: overview.finishedCount,
      rejected: overview.rejectedCount,
    },
    urgentDeadlines: upcoming
      .filter((d) => d.days <= 15)
      .slice(0, 4)
      .map((d) => ({ name: shortName(d.name), days: d.days })),
    soonDeadlines: upcoming
      .filter((d) => d.days > 15 && d.days <= 30)
      .slice(0, 4)
      .map((d) => ({ name: shortName(d.name), days: d.days })),
    acceptedAwaiting: papers.filter((p) => p.status === 'Chấp nhận').length,
    longReview,
    unpaidApc: { count: overview.unpaid.count, amount: overview.unpaid.amount },
  }
}

// Reuse the last generated note while its signals are unchanged, and dedupe
// concurrent generations for the same signals — the note only needs to change
// when the underlying data does.
let cache: { key: string; note: DashboardNote; at: number } | null = null
let inflight: { key: string; promise: Promise<DashboardNote | null> } | null = null

aiRouter.get('/briefing', async (c) => {
  const { papers, conferences, specialIssues, rewardCategories } = await loadAll()
  const deadlines = computeDeadlines(conferences, specialIssues)
  const fallback = composeNudge(deadlines, papers)

  if (!useAI) return c.json<BriefingResponse>({ ...fallback, source: 'fallback' })

  const signals = buildSignals(computeOverview(papers, rewardCategories), deadlines, papers)
  const key = JSON.stringify(signals)
  const now = Date.now()

  if (cache && cache.key === key && now - cache.at < CACHE_TTL_MS) {
    return c.json<BriefingResponse>({ ...cache.note, source: 'ai' })
  }

  if (!inflight || inflight.key !== key) {
    inflight = { key, promise: generateBriefingNote(signals) }
  }
  let note: DashboardNote | null = null
  try {
    note = await inflight.promise
  } finally {
    if (inflight?.key === key) inflight = null
  }

  if (!note) return c.json<BriefingResponse>({ ...fallback, source: 'fallback' })
  cache = { key, note, at: Date.now() }
  return c.json<BriefingResponse>({ ...note, source: 'ai' })
})

// Whether AI generation is available (a token is configured). The DOI path works
// without it, so the client uses this only to tailor hints.
aiRouter.get('/status', (c) => c.json({ enabled: useAI }))

// ─── Paper autofill (input edge) ─────────────────────────────────────────────
// Resolve a pasted DOI or free-text reference into a draft the owner confirms.
// DOI → Crossref (deterministic, no token needed); free text → Claude extraction.

type DraftSource = 'crossref' | 'ai' | 'none'

const extractSchema = z.object({ source: z.string().min(1) })

aiRouter.post('/extract-paper', zValidator('json', extractSchema), async (c) => {
  const { source } = c.req.valid('json' as never) as { source: string }
  const doi = extractDoi(source)

  if (doi) {
    const draft = await fetchCrossref(doi)
    if (draft)
      return c.json<{ draft: PaperDraft; source: DraftSource }>({ draft, source: 'crossref' })
    // Crossref missed (unregistered DOI / offline) — fall through to AI on the
    // raw text if available, else at least hand back the DOI itself.
    if (!useAI)
      return c.json<{ draft: PaperDraft; source: DraftSource }>({ draft: { doi }, source: 'none' })
  }

  if (!useAI) {
    return c.json<{ draft: PaperDraft; source: DraftSource }>({ draft: {}, source: 'none' })
  }
  const draft = await extractPaperFromText(source)
  return c.json<{ draft: PaperDraft; source: DraftSource }>({
    draft: draft ?? (doi ? { doi } : {}),
    source: draft ? 'ai' : 'none',
  })
})

// ─── Rank suggestion (input edge, explicitly a guess) ────────────────────────

const rankSchema = z.object({ venue: z.string().min(1), doi: z.string().optional() })

aiRouter.post('/suggest-rank', zValidator('json', rankSchema), async (c) => {
  if (!useAI) return c.json({ suggestion: null })
  const { venue, doi } = c.req.valid('json' as never) as { venue: string; doi?: string }
  const { rewardCategories } = await loadAll()
  const vocab = [...new Set(rewardCategories.map((r) => r.abbr).filter(Boolean))]
  const suggestion = await suggestRank(venue, vocab, doi)
  return c.json({ suggestion })
})

// ─── Ask the ledger (output edge, grounded NL Q&A) ───────────────────────────
// The model only reads and phrases: the server computes a deterministic snapshot
// (the same pure functions the dashboard uses) so every figure is authoritative.
// Author names + settlement amounts are in scope (the owner's own ledger); bank
// details, emails, and ORCIDs live in the catalog and never enter the snapshot.

const askSchema = z.object({
  question: z.string().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .max(20)
    .optional(),
})

type AskResponse = { answer: string; paperIds: number[]; enabled: boolean; error?: boolean }

/** A compact, fully-deterministic view of the ledger for the model to read. */
function buildLedgerSnapshot(data: Awaited<ReturnType<typeof loadAll>>) {
  const { papers, conferences, specialIssues, rewardCategories } = data
  const overview = computeOverview(papers, rewardCategories)
  const settlement = computeSettlement(papers, rewardCategories)
  const deadlines = computeDeadlines(conferences, specialIssues)
    .filter((d) => d.days >= 0)
    .sort((a, b) => a.days - b.days)

  return {
    today: new Date().toISOString().slice(0, 10),
    overview: {
      total: overview.total,
      journals: overview.journalCount,
      conferences: overview.confCount,
      inProcess: overview.inprocCount,
      finished: overview.finishedCount,
      rejected: overview.rejectedCount,
      published: overview.published,
      publishedPct: overview.pubPct,
      q1: overview.q1,
      q2: overview.q2,
      q1q2: overview.q12,
      rewardEst: overview.rewardEst,
      rewardEstText: money(overview.rewardEst),
      spent: overview.spent,
      spentText: money(overview.spent),
      roiX: overview.roiX,
      unpaidFeeCount: overview.unpaid.count,
      unpaidFeeAmount: overview.unpaid.amount,
      unpaidFeeText: money(overview.unpaid.amount),
      thisYear: overview.yearNow,
      lastYear: overview.yearPrev,
      rankTally: overview.tally,
    },
    settlement: {
      toCollect: { ...settlement.collect, amountText: money(settlement.collect.amount) },
      toPay: { ...settlement.pay, amountText: money(settlement.pay.amount) },
      settledCount: settlement.done.count,
      // Per-author net standing: positive = ledger owes them, negative = they owe.
      authors: Object.entries(settlement.authors)
        .filter(([, v]) => v.pend !== 0)
        .map(([author, v]) => ({ author, pending: v.pend, pendingText: money(v.pend) }))
        .sort((a, b) => Math.abs(b.pending) - Math.abs(a.pending)),
    },
    deadlines: deadlines.map((d) => ({
      name: d.name,
      sub: d.sub,
      deadline: d.deadline,
      daysLeft: d.days,
      kind: d.kind,
    })),
    papers: papers.map((p, i) => ({
      id: p.id,
      no: i + 1,
      title: p.title.slice(0, 90),
      venue: p.venue.slice(0, 55),
      type: p.type,
      rank: p.rank,
      status: p.status,
      group: statusGroup(p.status),
      date: p.date,
      year: (p.date ?? '').slice(0, 4),
      authors: p.authors,
      cost: paperTotal(p),
      unpaidFees: (p.apcEntries ?? []).filter((e) => e.status === 'Chưa trả').length,
      rewardEligible: rewardEligible(p.status),
    })),
  }
}

/** Pull a trailing "REF: 12, 45" line off the answer and return the ids. */
function parseRefs(text: string): { answer: string; ids: number[] } {
  const m = text.match(/\n*\s*REF:\s*([\d,\s]+)\s*$/i)
  if (!m || m.index == null) return { answer: text.trim(), ids: [] }
  const ids = m[1]
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
  return { answer: text.slice(0, m.index).trim(), ids }
}

aiRouter.post('/ask', zValidator('json', askSchema), async (c) => {
  if (!useAI) return c.json<AskResponse>({ answer: '', paperIds: [], enabled: false })
  const { question, history } = c.req.valid('json' as never) as {
    question: string
    history?: AskMessage[]
  }

  const data = await loadAll()
  const snapshot = buildLedgerSnapshot(data)
  // Keep the recent turns for follow-up context; older ones drop off to bound tokens.
  const text = await askLedger(question, snapshot, (history ?? []).slice(-8))
  if (!text) return c.json<AskResponse>({ answer: '', paperIds: [], enabled: true, error: true })

  const { answer, ids } = parseRefs(text)
  const known = new Set(data.papers.map((p) => p.id))
  return c.json<AskResponse>({ answer, paperIds: ids.filter((id) => known.has(id)), enabled: true })
})
