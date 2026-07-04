import type { RewardCategory } from './reward'
import type {
  ApcEntry,
  AuthorInput,
  ConferenceInput,
  Costs,
  Fin,
  JournalInput,
  PaperInput,
  SpecialIssueInput,
} from './schemas'
import type { PaperType, PaymentState, Status } from './vocab'

/** A stored paper row (v3 model). */
export interface Paper {
  id: number
  title: string
  type: PaperType
  venue: string
  rank: string
  status: Status
  date: string
  authors: string[]
  costs: Costs
  note: string
  doi: string
  link: string
  publink: string
  localpath: string
  role: string
  payment: PaymentState
  apcEntries: ApcEntry[]
  fin: Fin | null
  history: Record<string, string>
  position: number
  createdAt: string
  updatedAt: string
}

export interface Author extends AuthorInput {
  id: number
}
export interface Journal extends JournalInput {
  id: number
}
export interface Conference extends ConferenceInput {
  id: number
}
export interface SpecialIssue extends SpecialIssueInput {
  id: number
}

export interface Attachment {
  id: number
  paperId: number
  filename: string
  contentType: string
  size: number
  storageKey: string
  createdAt: string
}

/** The dashboard sticky note — the owner's free-form reminder. When its body is
 *  empty the overview falls back to a computed nudge (see `composeNudge`). */
export interface DashboardNote {
  body: string
  sign: string
}

/** A partial paper drafted from a DOI (Crossref) or free text, for the owner to
 *  review and confirm before it's written — the AI input edge. All fields
 *  optional: only what could be extracted is filled. */
export interface PaperDraft {
  title?: string
  type?: PaperType
  venue?: string
  rank?: string
  date?: string
  doi?: string
  link?: string
  authors?: string[]
}

export type { PaperInput, RewardCategory }

/** The full export/import bundle shape (matches DEFAULT_DB). */
export interface Database {
  v: 3
  papers: Paper[]
  journals: Journal[]
  conferences: Conference[]
  specialIssues: SpecialIssue[]
  authors: Author[]
  rewardCategories: RewardCategory[]
}
