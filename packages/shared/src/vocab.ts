/**
 * Canonical Vietnamese vocabulary for PaperTrack.
 *
 * The source dataset stores a few legacy / English status spellings. We
 * normalise everything to the nine canonical statuses below, then derive the
 * three top-level groups (đang xử lý / hoàn thành / từ chối) from status.
 * This derivation reconciles exactly to the reference dataset: 34 / 107 / 9.
 */

// ─── Paper type ──────────────────────────────────────────────────────────────
export const PAPER_TYPES = ['Tạp chí', 'Hội thảo'] as const
export type PaperType = (typeof PAPER_TYPES)[number]

// ─── Status ──────────────────────────────────────────────────────────────────
export const STATUSES = [
  'Nộp bài',
  'Đang phản biện',
  'Chỉnh sửa',
  'Đánh giá lại',
  'Chấp nhận',
  'Chờ công bố',
  'Công bố',
  'Xét khen thưởng',
  'Từ chối',
] as const
export type Status = (typeof STATUSES)[number]

export type StatusGroup = 'inprocess' | 'finished' | 'rejected'

export interface StatusMeta {
  /** Canonical value stored in the DB. */
  key: Status
  /** Full label. */
  label: string
  /** Compact label used on dense cards / column heads. */
  short: string
  /** Accent colour (semantic, toned into the paper palette by the UI). */
  color: string
  /** Which top-level group this status rolls up into. */
  group: StatusGroup
}

// Colors are the design's toned `_SC()` map — muted to sit on warm paper.
export const STATUS_META: Record<Status, StatusMeta> = {
  'Nộp bài': {
    key: 'Nộp bài',
    label: 'Nộp bài',
    short: 'Nộp bài',
    color: '#2B5C9E',
    group: 'inprocess',
  },
  'Đang phản biện': {
    key: 'Đang phản biện',
    label: 'Đang phản biện',
    short: 'Phản biện',
    color: '#5C4EA8',
    group: 'inprocess',
  },
  'Chỉnh sửa': {
    key: 'Chỉnh sửa',
    label: 'Chỉnh sửa',
    short: 'Chỉnh sửa',
    color: '#B4691E',
    group: 'inprocess',
  },
  'Đánh giá lại': {
    key: 'Đánh giá lại',
    label: 'Đánh giá lại',
    short: 'Đánh giá lại',
    color: '#A3382B',
    group: 'inprocess',
  },
  'Chấp nhận': {
    key: 'Chấp nhận',
    label: 'Chấp nhận',
    short: 'Chấp nhận',
    color: '#5A6E3A',
    group: 'inprocess',
  },
  'Chờ công bố': {
    key: 'Chờ công bố',
    label: 'Chờ công bố',
    short: 'Chờ công bố',
    color: '#77705F',
    group: 'finished',
  },
  'Công bố': {
    key: 'Công bố',
    label: 'Công bố',
    short: 'Công bố',
    color: '#3E6E45',
    group: 'finished',
  },
  'Xét khen thưởng': {
    key: 'Xét khen thưởng',
    label: 'Xét khen thưởng',
    short: 'Khen thưởng',
    color: '#8A6D1F',
    group: 'finished',
  },
  'Từ chối': {
    key: 'Từ chối',
    label: 'Từ chối',
    short: 'Từ chối',
    color: '#A3382B',
    group: 'rejected',
  },
}

/** Legacy / English / blank spellings → canonical status. */
const STATUS_ALIASES: Record<string, Status> = {
  Publication: 'Công bố',
  'Đang chờ công bố': 'Chờ công bố',
  Rejected: 'Từ chối',
  'Từ chối': 'Từ chối',
  '': 'Nộp bài',
}

export function normalizeStatus(raw: string | null | undefined): Status {
  const v = (raw ?? '').trim()
  if ((STATUS_META as Record<string, StatusMeta>)[v]) return v as Status
  return STATUS_ALIASES[v] ?? 'Nộp bài'
}

export function statusGroup(status: Status): StatusGroup {
  return STATUS_META[status].group
}

/** The linear advance pipeline (Từ chối is terminal / off-pipeline). */
export const PIPELINE = STATUSES.slice(0, 8) as readonly Status[]

/** Index in the advance pipeline, or -1 for Từ chối. */
export function pipelineIndex(status: Status): number {
  return PIPELINE.indexOf(status)
}

/** Next status when advancing, or null at the end / for Từ chối. */
export function nextStatus(status: Status): Status | null {
  const i = pipelineIndex(status)
  if (i < 0 || i >= PIPELINE.length - 1) return null
  return PIPELINE[i + 1] ?? null
}

/** Reward is counted from "Chấp nhận" (index 4) onward. */
export const REWARD_MIN_INDEX = 4
export function rewardEligible(status: Status): boolean {
  return pipelineIndex(status) >= REWARD_MIN_INDEX
}

/** "Published" for the success-rate metric. */
export function isPublished(status: Status): boolean {
  return status === 'Công bố' || status === 'Xét khen thưởng'
}

// ─── Top-level groups (sub-nav: MỤC ›) ───────────────────────────────────────
export type GroupKey = 'inprocess' | 'finished' | 'rejected' | 'all'

export interface GroupMeta {
  key: GroupKey
  label: string
  statuses: readonly Status[]
}

export const GROUPS: Record<GroupKey, GroupMeta> = {
  inprocess: {
    key: 'inprocess',
    label: 'Đang xử lý',
    statuses: ['Nộp bài', 'Đang phản biện', 'Chỉnh sửa', 'Đánh giá lại', 'Chấp nhận'],
  },
  finished: {
    key: 'finished',
    label: 'Hoàn thành',
    statuses: ['Chờ công bố', 'Công bố', 'Xét khen thưởng'],
  },
  rejected: { key: 'rejected', label: 'Từ chối', statuses: ['Từ chối'] },
  all: { key: 'all', label: 'Tất cả hồ sơ', statuses: STATUSES },
}

/** Kanban column order per group. `all` reuses the full pipeline. */
export const KANBAN_COLUMNS: Record<Exclude<GroupKey, 'rejected'>, readonly Status[]> & {
  rejected: readonly Status[]
} = {
  inprocess: GROUPS.inprocess.statuses,
  finished: GROUPS.finished.statuses,
  rejected: GROUPS.rejected.statuses,
  all: STATUSES,
}

// ─── Author role (multi-value, comma separated in the data) ──────────────────
export const ROLES = [
  'Tác giả liên hệ',
  'Tác giả chính',
  'Tác giả đầu tiên',
  'Tham gia',
  'Không đứng tên',
] as const
export type Role = (typeof ROLES)[number]

export function parseRoles(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean)
}

// ─── Payment state (paper-level) ─────────────────────────────────────────────
export const PAYMENT_STATES = ['Chưa phí', 'Chưa trả', 'Đã trả'] as const
export type PaymentState = (typeof PAYMENT_STATES)[number] | ''

export const PAYMENT_META: Record<string, { label: string; color: string }> = {
  'Chưa phí': { label: 'Chưa phí', color: '#94A3B8' },
  'Chưa trả': { label: 'Chưa trả', color: '#B91C1C' },
  'Đã trả': { label: 'Đã trả', color: '#10B981' },
  '': { label: '—', color: '#B0A890' },
}

// ─── Cost-entry status ───────────────────────────────────────────────────────
export const COST_STATES = ['Chưa trả', 'Đã trả'] as const
export type CostState = (typeof COST_STATES)[number]

// ─── Rank quartile helpers ───────────────────────────────────────────────────
export const QUARTILES = ['Q1', 'Q2', 'Q3', 'Q4'] as const
export type Quartile = (typeof QUARTILES)[number]

/** Pull the highest (best) quartile mentioned in a rank string, e.g. "Q3, ESCI, Q4" → Q3. */
export function bestQuartile(rank: string | null | undefined): Quartile | null {
  const found = QUARTILES.filter((q) => (rank ?? '').toUpperCase().includes(q))
  return found.length ? (found.sort()[0] as Quartile) : null
}

export function hasIndex(rank: string | null | undefined, token: string): boolean {
  return (rank ?? '').toUpperCase().includes(token.toUpperCase())
}
