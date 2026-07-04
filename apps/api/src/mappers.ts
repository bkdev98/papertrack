import type {
  Attachment,
  Author,
  Conference,
  DashboardNote,
  Journal,
  Paper,
  PaymentState,
  SpecialIssue,
  Status,
} from '@papertrack/shared'
import type {
  AttachmentRow,
  AuthorRow,
  ConferenceRow,
  DashboardNoteRow,
  JournalRow,
  PaperRow,
  RewardCategoryRow,
  SpecialIssueRow,
} from './db/schema'

const iso = (d: Date | string): string => (typeof d === 'string' ? d : d.toISOString())

export function mapPaper(row: PaperRow): Paper {
  return {
    id: row.id,
    title: row.title,
    type: row.type as Paper['type'],
    venue: row.venue,
    rank: row.rank,
    status: row.status as Status,
    date: row.date,
    authors: row.authors ?? [],
    costs: row.costs ?? { apc: 0, conf: 0, other: 0 },
    note: row.note,
    doi: row.doi,
    link: row.link,
    publink: row.publink,
    localpath: row.localpath,
    role: row.role,
    payment: row.payment as PaymentState,
    apcEntries: row.apcEntries ?? [],
    fin: row.fin ?? null,
    history: row.history ?? {},
    position: row.position,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  }
}

export const mapAuthor = (r: AuthorRow): Author => r
export const mapJournal = (r: JournalRow): Journal => r
export const mapConference = (r: ConferenceRow): Conference => r
export const mapSpecialIssue = (r: SpecialIssueRow): SpecialIssue => ({
  ...r,
  type: r.type as SpecialIssue['type'],
})
export const mapRewardCategory = (r: RewardCategoryRow) => r

export const mapDashboardNote = (r: DashboardNoteRow): DashboardNote & { updatedAt: string } => ({
  body: r.body,
  sign: r.sign,
  updatedAt: iso(r.updatedAt),
})

export const mapAttachment = (r: AttachmentRow): Attachment => ({
  id: r.id,
  paperId: r.paperId,
  filename: r.filename,
  contentType: r.contentType,
  size: r.size,
  storageKey: r.storageKey,
  createdAt: iso(r.createdAt),
})
