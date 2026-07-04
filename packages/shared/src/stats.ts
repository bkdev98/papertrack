/**
 * Dashboard aggregates + internal-settlement model.
 * Faithful ports of the design's `renderVals()` formulas (spec §8), kept here
 * as pure functions so the API and web share one source of truth.
 */
import { pad, parseMoney, parseVnDate } from './format'
import { DEFAULT_REWARD_CATEGORIES, type RewardCategory, matchRewardCategory } from './reward'
import type { Conference, DashboardNote, Paper, SpecialIssue } from './types'
import {
  PIPELINE,
  REWARD_MIN_INDEX,
  type Status,
  isPublished,
  pipelineIndex,
  statusGroup,
} from './vocab'

export function paperTotal(p: Pick<Paper, 'costs'>): number {
  return (p.costs?.apc ?? 0) + (p.costs?.conf ?? 0) + (p.costs?.other ?? 0)
}

export function isRejected(p: Pick<Paper, 'status'>): boolean {
  return statusGroup(p.status) === 'rejected'
}

function rankHas(rank: string, token: string): boolean {
  return (rank ?? '').toUpperCase().includes(token)
}

// ─── Overview / dashboard ────────────────────────────────────────────────────
export interface StageStat {
  status: Status
  count: number
}
export interface MonthBucket {
  key: string
  month: number
  year: number
  count: number
}
export interface TallyRow {
  label: string
  count: number
}
export interface OverviewStats {
  total: number
  journalCount: number
  confCount: number
  rejectedCount: number
  inprocCount: number
  finishedCount: number
  published: number
  pubPct: number
  q1: number
  q2: number
  q12: number
  rewardEst: number
  spent: number
  roiX: number
  yearNow: { year: number; count: number }
  yearPrev: { year: number; count: number }
  yearDelta: number
  unpaid: { amount: number; count: number }
  stages: StageStat[]
  spark: { months: MonthBucket[]; peak: MonthBucket | null; total: number }
  tally: TallyRow[]
}

export function computeOverview(
  papers: Paper[],
  rewardCategories: RewardCategory[] = DEFAULT_REWARD_CATEGORIES,
  now: Date = new Date(),
): OverviewStats {
  const total = papers.length
  const groups = { inprocess: 0, finished: 0, rejected: 0 }
  let published = 0
  let q1 = 0
  let q2 = 0
  let rewardEst = 0
  let spent = 0
  let journalCount = 0
  let confCount = 0
  let unpaidAmount = 0
  let unpaidCount = 0

  const yearNow = now.getFullYear()
  const yearPrev = yearNow - 1
  let yearNowCount = 0
  let yearPrevCount = 0

  const stageCounts = new Map<Status, number>(PIPELINE.slice(0, 5).map((s) => [s, 0]))
  const monthMap = new Map<string, number>()
  const tally = { 'WoS-Q1': 0, 'WoS-Q2': 0, Scopus: 0, Khác: 0 }

  for (const p of papers) {
    const g = statusGroup(p.status)
    groups[g] += 1
    if (isPublished(p.status)) published += 1
    if (p.type === 'Tạp chí') journalCount += 1
    else confCount += 1

    const rejected = g === 'rejected'
    if (!rejected && rankHas(p.rank, 'Q1')) q1 += 1
    if (!rejected && rankHas(p.rank, 'Q2')) q2 += 1

    if (pipelineIndex(p.status) >= REWARD_MIN_INDEX) {
      rewardEst += matchRewardCategory(p.rank, p.type, rewardCategories)?.amount ?? 0
    }
    spent += paperTotal(p)

    for (const e of p.apcEntries ?? []) {
      if (e.status === 'Chưa trả') {
        unpaidAmount += parseMoney(e.amount)
        unpaidCount += 1
      }
    }

    const y = (p.date ?? '').slice(0, 4)
    if (y === String(yearNow)) yearNowCount += 1
    else if (y === String(yearPrev)) yearPrevCount += 1

    if (stageCounts.has(p.status)) stageCounts.set(p.status, (stageCounts.get(p.status) ?? 0) + 1)

    const d = parseVnDate(p.date)
    if (d) {
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
      monthMap.set(key, (monthMap.get(key) ?? 0) + 1)
    }

    // Tally by rank group (exclude rejected)
    if (!rejected) {
      const r = (p.rank ?? '').toUpperCase()
      if (r.includes('Q1') && /SSCI|SCIE|A&HCI/.test(r)) tally['WoS-Q1'] += 1
      else if (r.includes('Q2') && /SSCI|SCIE|A&HCI/.test(r)) tally['WoS-Q2'] += 1
      else if (r.includes('SCOPUS') || /Q[1-4]/.test(r)) tally.Scopus += 1
      else tally.Khác += 1
    }
  }

  // 12-month sparkline ending on the current month
  const months: MonthBucket[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
    months.push({
      key,
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      count: monthMap.get(key) ?? 0,
    })
  }
  const peak = months.reduce<MonthBucket | null>(
    (best, m) => (!best || m.count > best.count ? m : best),
    null,
  )
  const sparkTotal = months.reduce((s, m) => s + m.count, 0)

  return {
    total,
    journalCount,
    confCount,
    rejectedCount: groups.rejected,
    inprocCount: groups.inprocess,
    finishedCount: groups.finished,
    published,
    pubPct: total ? Math.round((published / total) * 100) : 0,
    q1,
    q2,
    q12: q1 + q2,
    rewardEst,
    spent,
    roiX: spent > 0 && rewardEst > 0 ? rewardEst / spent : 0,
    yearNow: { year: yearNow, count: yearNowCount },
    yearPrev: { year: yearPrev, count: yearPrevCount },
    yearDelta: yearNowCount - yearPrevCount,
    unpaid: { amount: unpaidAmount, count: unpaidCount },
    stages: [...stageCounts].map(([status, count]) => ({ status, count })),
    spark: { months, peak, total: sparkTotal },
    tally: Object.entries(tally).map(([label, count]) => ({ label, count })),
  }
}

// ─── Deadlines (conferences + special issues) ────────────────────────────────
export interface Deadline {
  kind: 'conference' | 'specialIssue'
  id: number
  name: string
  sub: string
  deadline: string
  days: number
  urgent: boolean
  warn: boolean
}

export function computeDeadlines(
  conferences: Conference[],
  specialIssues: SpecialIssue[],
  now: Date = new Date(),
): Deadline[] {
  const out: Deadline[] = []
  const dayDiff = (iso: string): number | null => {
    const d = parseVnDate(iso)
    if (!d) return null
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
    return Math.ceil((end.getTime() - now.getTime()) / 86_400_000)
  }
  for (const c of conferences) {
    const days = dayDiff(c.deadline)
    if (days == null) continue
    out.push({
      kind: 'conference',
      id: c.id,
      name: c.name,
      sub: [c.location, c.rank].filter(Boolean).join(' · '),
      deadline: c.deadline,
      days,
      urgent: days >= 0 && days <= 15,
      warn: days > 15 && days <= 30,
    })
  }
  for (const s of specialIssues) {
    const days = dayDiff(s.deadline)
    if (days == null) continue
    out.push({
      kind: 'specialIssue',
      id: s.id,
      name: s.name,
      sub: [s.journal, s.rank].filter(Boolean).join(' · '),
      deadline: s.deadline,
      days,
      urgent: days >= 0 && days <= 15,
      warn: days > 15 && days <= 30,
    })
  }
  return out.sort((a, b) => a.days - b.days)
}

// ─── Dashboard nudge (auto sticky-note fallback) ─────────────────────────────
/** `dd/mm` for the nudge sentence (falls back to "?" on an unparseable date). */
function shortDay(iso: string): string {
  const d = parseVnDate(iso)
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : '?'
}

/** A compact label for the tiny sticky note: the trailing "(ACRONYM)" when a
 *  venue name carries one, else the name truncated. */
function shortName(name: string): string {
  const acronym = name.match(/\(([^)]{2,24})\)\s*$/)
  if (acronym?.[1]) return acronym[1]
  return name.length > 42 ? `${name.slice(0, 40).trimEnd()}…` : name
}

/**
 * Derive the overview sticky note from real signals when the owner hasn't
 * written one. Deterministic fallback for the AI generator (see routes/ai) —
 * both return {body, sign} and share the display contract. PaperTrack is a
 * single-owner ledger, so the copy addresses one person, never a team.
 * Priority: urgent deadline → accepted-awaiting → soon deadline → unpaid fees →
 * clean desk.
 */
export function composeNudge(deadlines: Deadline[], papers: Paper[]): DashboardNote {
  const sign = 'PaperTrack'
  const upcoming = deadlines.filter((d) => d.days >= 0).sort((a, b) => a.days - b.days)
  const top = upcoming[0]

  if (top && top.days <= 15) {
    return {
      body: `Nhắc: ${shortName(top.name)} — hạn ${shortDay(top.deadline)}, còn ${top.days} ngày!`,
      sign,
    }
  }

  const accepted = papers.filter((p) => p.status === 'Chấp nhận').length
  if (accepted > 0) {
    return {
      body: `${accepted} bài đã chấp nhận — chuẩn bị bản camera-ready & hồ sơ thưởng.`,
      sign,
    }
  }

  if (top && top.days <= 30) {
    return {
      body: `Sắp tới: ${shortName(top.name)} — hạn ${shortDay(top.deadline)}, còn ${top.days} ngày.`,
      sign,
    }
  }

  const unpaid = papers.reduce(
    (n, p) => n + (p.apcEntries ?? []).filter((e) => e.status === 'Chưa trả').length,
    0,
  )
  if (unpaid > 0) {
    return { body: `Còn ${unpaid} khoản phí chưa thanh toán — cần xử lý.`, sign }
  }

  return { body: 'Sạch sổ — không có hạn nào gấp. Giữ nhịp nghiên cứu đều tay!', sign }
}

// ─── Internal settlement (fund model) ────────────────────────────────────────
export type SettleKind = 'collect' | 'pay' | 'settled' | 'waiting'
export interface SettleAuthorRow {
  author: string
  target: number
  paid: number
  pending: number
  kind: SettleKind
  paidDate: string
}
export interface SettleSlip {
  paperId: number
  title: string
  venue: string
  authorCount: number
  cost: number
  rewardExpected: number
  rewardReceived: boolean
  net: number
  share: number
  rows: SettleAuthorRow[]
  pendSum: number
  settled: boolean
}
export interface Settlement {
  slips: SettleSlip[]
  collect: { amount: number; count: number }
  pay: { amount: number; count: number }
  done: { count: number }
  authors: Record<string, { pend: number }>
}

export function computeSettlement(
  papers: Paper[],
  rewardCategories: RewardCategory[] = DEFAULT_REWARD_CATEGORIES,
): Settlement {
  const slips: SettleSlip[] = []
  const authors: Record<string, { pend: number }> = {}
  let collectAmt = 0
  let collectN = 0
  let payAmt = 0
  let payN = 0
  let doneN = 0

  for (const p of papers) {
    const names = p.authors ?? []
    const n = names.length
    const cost = paperTotal(p)
    const cat = matchRewardCategory(p.rank, p.type, rewardCategories)
    const manualShares = p.fin?.shares && Object.keys(p.fin.shares).length > 0
    const eligible = pipelineIndex(p.status) >= REWARD_MIN_INDEX
    const rewardExpected = !manualShares && cat && eligible ? cat.amount : 0

    if (!manualShares && !(n >= 2 && (cost > 0 || rewardExpected > 0))) continue

    const rewardReceived = !!p.fin?.rewardReceived
    const rewardIn = rewardReceived && rewardExpected ? rewardExpected : 0
    const evenTarget = n > 0 ? Math.round((rewardIn - cost) / n) : 0

    const rows: SettleAuthorRow[] = []
    let pendSum = 0
    const rowNames = manualShares ? Object.keys(p.fin?.shares ?? {}) : names
    for (const author of rowNames) {
      const target = manualShares ? (p.fin?.shares?.[author] ?? 0) : evenTarget
      const paidRec = p.fin?.paid?.[author]
      const paid = paidRec?.amount ?? 0
      const pending = target - paid
      let kind: SettleKind
      if (rewardExpected && !rewardReceived && !manualShares) kind = 'waiting'
      else if (pending < 0) kind = 'collect'
      else if (pending > 0) kind = 'pay'
      else kind = 'settled'
      rows.push({ author, target, paid, pending, kind, paidDate: paidRec?.date ?? '' })
      pendSum += pending
      authors[author] = { pend: (authors[author]?.pend ?? 0) + pending }
      if (kind === 'collect') {
        collectAmt += -pending
        collectN += 1
      } else if (kind === 'pay') {
        payAmt += pending
        payN += 1
      } else if (kind === 'settled' && paid !== 0) {
        doneN += 1
      }
    }

    const net = manualShares
      ? Object.values(p.fin?.shares ?? {}).reduce((s, v) => s + v, 0)
      : rewardIn - cost
    slips.push({
      paperId: p.id,
      title: p.title,
      venue: p.venue,
      authorCount: n,
      cost,
      rewardExpected,
      rewardReceived,
      net,
      share: n > 0 ? Math.round(net / n) : 0,
      rows,
      pendSum,
      settled: pendSum === 0,
    })
  }

  slips.sort((a, b) => Math.abs(b.pendSum) - Math.abs(a.pendSum) || b.cost - a.cost)
  return {
    slips,
    collect: { amount: collectAmt, count: collectN },
    pay: { amount: payAmt, count: payN },
    done: { count: doneN },
    authors,
  }
}
