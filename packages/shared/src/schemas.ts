import { z } from 'zod'
import { PAPER_TYPES, STATUSES } from './vocab'

/** Coerce the dataset's money strings ("7500000", "150.480.000", "") to a number. */
export const moneyField = z
  .union([z.number(), z.string()])
  .transform((v) => {
    if (typeof v === 'number') return Math.round(v)
    const neg = /^-/.test(v.trim())
    const digits = v.replace(/[^\d]/g, '')
    const n = digits ? Number(digits) : 0
    return neg ? -n : n
  })
  .pipe(z.number().int())

const str = z
  .string()
  .nullish()
  .transform((v) => v ?? '')

// ─── Cost buckets (fund spend) ───────────────────────────────────────────────
export const costsSchema = z.object({
  apc: moneyField.default(0),
  conf: moneyField.default(0),
  other: moneyField.default(0),
})
export type Costs = z.infer<typeof costsSchema>

// ─── APC line items ──────────────────────────────────────────────────────────
export const apcEntrySchema = z.object({
  desc: str,
  payer: str,
  amount: moneyField.default(0),
  status: z.enum(['Chưa trả', 'Đã trả']).or(z.literal('')).default('Chưa trả'),
})
export type ApcEntry = z.infer<typeof apcEntrySchema>

// ─── Per-author settlement (`fin`) ───────────────────────────────────────────
export const finPaidSchema = z.object({ amount: moneyField.default(0), date: str })
export const finSchema = z.object({
  shares: z.record(moneyField).default({}),
  paid: z.record(finPaidSchema).default({}),
  rewardReceived: z.boolean().default(false),
  rewardDate: str,
})
export type Fin = z.infer<typeof finSchema>

// ─── Paper (v3) ──────────────────────────────────────────────────────────────
export const paperInputSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được trống'),
  type: z.enum(PAPER_TYPES).default('Tạp chí'),
  venue: str,
  rank: str,
  status: z.enum(STATUSES).default('Nộp bài'),
  date: str, // ISO YYYY-MM-DD
  authors: z.array(z.string()).default([]),
  costs: costsSchema.default({ apc: 0, conf: 0, other: 0 }),
  note: str,
  doi: str,
  link: str,
  publink: str,
  localpath: str,
  role: str,
  payment: z.enum(['Chưa phí', 'Chưa trả', 'Đã trả']).or(z.literal('')).default(''),
  apcEntries: z.array(apcEntrySchema).default([]),
  fin: finSchema.nullish(),
  history: z.record(z.string()).default({}),
})
export type PaperInput = z.infer<typeof paperInputSchema>

export const paperPatchSchema = paperInputSchema.partial()
export type PaperPatch = z.infer<typeof paperPatchSchema>

/** Kanban move: set status + fractional ordering hint. */
export const moveSchema = z.object({
  status: z.enum(STATUSES),
  beforeId: z.number().int().nullish(),
  afterId: z.number().int().nullish(),
})
export type MoveInput = z.infer<typeof moveSchema>

/** Record a settlement payment (partial or whole) for one author on one paper. */
export const paymentRecordSchema = z.object({
  author: z.string().min(1),
  amount: moneyField,
  date: str,
})
export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>

// ─── Author ──────────────────────────────────────────────────────────────────
export const authorInputSchema = z.object({
  name: z.string().min(1, 'Tên không được trống'),
  title: str,
  unit: str,
  email: str,
  orcid: str,
  bank: str,
  note: str,
})
export type AuthorInput = z.infer<typeof authorInputSchema>

// ─── Journal ─────────────────────────────────────────────────────────────────
export const journalInputSchema = z.object({
  name: z.string().min(1),
  rank: str,
  publisher: str,
  issn: str,
  impact: str,
  country: str,
  web: str,
  fee: str,
  note: str,
})
export type JournalInput = z.infer<typeof journalInputSchema>

// ─── Conference ──────────────────────────────────────────────────────────────
export const conferenceInputSchema = z.object({
  name: z.string().min(1),
  rank: str,
  location: str,
  deadline: str,
  confdate: str,
  fee: moneyField.default(0),
  feeText: str,
  web: str,
  note: str,
})
export type ConferenceInput = z.infer<typeof conferenceInputSchema>

// ─── Special issue / book chapter ────────────────────────────────────────────
export const specialIssueInputSchema = z.object({
  name: z.string().min(1),
  journal: str,
  rank: str,
  deadline: str,
  type: z.enum(['Special Issue', 'Book Chapter']).default('Special Issue'),
  note: str,
})
export type SpecialIssueInput = z.infer<typeof specialIssueInputSchema>

// ─── Reward category ─────────────────────────────────────────────────────────
export const rewardCategoryInputSchema = z.object({
  name: z.string().min(1),
  abbr: str,
  group: str,
  amount: moneyField.default(0),
  issn: str,
  note: str,
})
export type RewardCategoryInput = z.infer<typeof rewardCategoryInputSchema>

// ─── Dashboard sticky note ───────────────────────────────────────────────────
export const dashboardNoteInputSchema = z.object({
  body: z.string().max(280).default(''),
  sign: z.string().max(40).default(''),
})
export type DashboardNoteInput = z.infer<typeof dashboardNoteInputSchema>

// ─── Auth ────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({ password: z.string().min(1) })
export type LoginInput = z.infer<typeof loginSchema>

// ─── Import bundle (round-trips the dataset export) ──────────────────────────
export const importBundleSchema = z.object({
  v: z.number().optional(),
  _meta: z.record(z.unknown()).optional(),
  authors: z.array(z.record(z.unknown())).default([]),
  journals: z.array(z.record(z.unknown())).default([]),
  conferences: z.array(z.record(z.unknown())).default([]),
  specialIssues: z.array(z.record(z.unknown())).default([]),
  papers: z.array(z.record(z.unknown())).default([]),
  rewardCategories: z.array(z.record(z.unknown())).optional(),
})
export type ImportBundle = z.infer<typeof importBundleSchema>
