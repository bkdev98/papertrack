/**
 * Normalisation + legacy conversion.
 *
 * The primary seed (`seed-data.json`) is already v3 (the design's DEFAULT_DB).
 * These helpers coerce arbitrary records — v3 or the older v2 JSON export the
 * app can import — into clean insert rows.
 */
import { PAPER_TYPES, type Status, normalizeStatus, parseMoney } from '@papertrack/shared'
import type {
  AuthorRow,
  ConferenceRow,
  JournalRow,
  PaperInsert,
  RewardCategoryRow,
  SpecialIssueRow,
} from './schema'

type Any = Record<string, any>

const s = (v: unknown): string => (v == null ? '' : String(v))

function toAuthors(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((a) => s(a).trim()).filter(Boolean)
  return s(raw)
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter(Boolean)
}

function toType(raw: unknown): string {
  const v = s(raw)
  return (PAPER_TYPES as readonly string[]).includes(v) ? v : 'Tạp chí'
}

function toApcEntries(raw: unknown): Any[] {
  if (!Array.isArray(raw)) return []
  return raw.map((e: Any) => ({
    desc: s(e.desc),
    payer: s(e.payer),
    amount: parseMoney(e.amount),
    status: e.status === 'Đã trả' ? 'Đã trả' : e.status === 'Chưa trả' ? 'Chưa trả' : '',
  }))
}

function toFin(raw: Any): PaperInsert['fin'] {
  if (!raw || typeof raw !== 'object') return null
  const shares: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw.shares ?? {})) shares[k] = parseMoney(v as any)
  const paid: Record<string, { amount: number; date: string }> = {}
  for (const [k, v] of Object.entries(raw.paid ?? {})) {
    const pv = v as Any
    paid[k] = { amount: parseMoney(pv?.amount), date: s(pv?.date) }
  }
  return {
    shares,
    paid,
    rewardReceived: Boolean(raw.rewardReceived),
    rewardDate: s(raw.rewardDate),
  }
}

export function normalizePaper(raw: Any, index = 0): PaperInsert {
  const costs = raw.costs ?? {}
  const fin = toFin(raw.fin)
  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    title: s(raw.title),
    type: toType(raw.type),
    venue: s(raw.venue ?? raw.journal),
    rank: s(raw.rank),
    status: normalizeStatus(raw.status) as Status,
    date: s(raw.date),
    authors: toAuthors(raw.authors),
    costs: {
      apc: parseMoney(costs.apc),
      conf: parseMoney(costs.conf),
      other: parseMoney(costs.other),
    },
    note: s(raw.note),
    doi: s(raw.doi),
    link: s(raw.link),
    publink: s(raw.publink),
    localpath: s(raw.localpath),
    role: s(raw.role),
    payment: s(raw.payment),
    apcEntries: toApcEntries(raw.apcEntries) as PaperInsert['apcEntries'],
    fin:
      fin && (Object.keys(fin.shares).length || Object.keys(fin.paid).length || fin.rewardReceived)
        ? fin
        : null,
    history: (raw.history && typeof raw.history === 'object' ? raw.history : {}) as Record<
      string,
      string
    >,
    position: index,
  }
}

export function normalizeAuthor(raw: Any): Omit<AuthorRow, 'id'> & { id?: number } {
  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    name: s(raw.name),
    title: s(raw.title),
    unit: s(raw.unit ?? raw.org),
    email: s(raw.email),
    orcid: s(raw.orcid),
    bank: s(raw.bank),
    note: s(raw.note),
  }
}

export function normalizeJournal(raw: Any): Omit<JournalRow, 'id'> & { id?: number } {
  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    name: s(raw.name),
    rank: s(raw.rank),
    publisher: s(raw.publisher),
    issn: s(raw.issn),
    impact: s(raw.impact),
    country: s(raw.country),
    web: s(raw.web),
    fee: s(raw.fee),
    note: s(raw.note),
  }
}

export function normalizeConference(raw: Any): Omit<ConferenceRow, 'id'> & { id?: number } {
  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    name: s(raw.name),
    rank: s(raw.rank),
    location: s(raw.location),
    deadline: s(raw.deadline),
    confdate: s(raw.confdate),
    fee: parseMoney(raw.fee),
    feeText: s(raw.feeText ?? (typeof raw.fee === 'string' ? raw.fee : '')),
    web: s(raw.web),
    note: s(raw.note),
  }
}

export function normalizeSpecialIssue(raw: Any): Omit<SpecialIssueRow, 'id'> & { id?: number } {
  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    name: s(raw.name),
    journal: s(raw.journal),
    rank: s(raw.rank),
    deadline: s(raw.deadline),
    type: raw.type === 'Book Chapter' ? 'Book Chapter' : 'Special Issue',
    note: s(raw.note),
  }
}

export function normalizeRewardCategory(raw: Any): Omit<RewardCategoryRow, 'id'> & { id?: number } {
  return {
    id: typeof raw.id === 'number' ? raw.id : undefined,
    name: s(raw.name),
    abbr: s(raw.abbr),
    group: s(raw.group),
    amount: parseMoney(raw.amount),
    issn: s(raw.issn),
    note: s(raw.note),
  }
}

export interface NormalizedBundle {
  papers: PaperInsert[]
  authors: ReturnType<typeof normalizeAuthor>[]
  journals: ReturnType<typeof normalizeJournal>[]
  conferences: ReturnType<typeof normalizeConference>[]
  specialIssues: ReturnType<typeof normalizeSpecialIssue>[]
  rewardCategories: ReturnType<typeof normalizeRewardCategory>[]
}

/** Accepts a v3 DEFAULT_DB or a legacy v2 export; returns normalized rows. */
export function normalizeBundle(raw: Any): NormalizedBundle {
  return {
    papers: (raw.papers ?? []).map((p: Any, i: number) => normalizePaper(p, i)),
    authors: (raw.authors ?? []).map(normalizeAuthor),
    journals: (raw.journals ?? []).map(normalizeJournal),
    conferences: (raw.conferences ?? []).map(normalizeConference),
    specialIssues: (raw.specialIssues ?? []).map(normalizeSpecialIssue),
    rewardCategories: (raw.rewardCategories ?? []).map(normalizeRewardCategory),
  }
}
