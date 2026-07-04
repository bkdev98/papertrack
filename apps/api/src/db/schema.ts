import type { ApcEntry, Costs, Fin } from '@papertrack/shared'
import { sql } from 'drizzle-orm'
import {
  bigint,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

const now = () => timestamp({ withTimezone: true }).notNull().defaultNow()

export const papers = pgTable('papers', {
  id: serial().primaryKey(),
  title: text().notNull(),
  type: text().notNull().default('Tạp chí'),
  venue: text().notNull().default(''),
  rank: text().notNull().default(''),
  status: text().notNull().default('Nộp bài'),
  date: text().notNull().default(''),
  authors: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  costs: jsonb().$type<Costs>().notNull().default(sql`'{"apc":0,"conf":0,"other":0}'::jsonb`),
  note: text().notNull().default(''),
  doi: text().notNull().default(''),
  link: text().notNull().default(''),
  publink: text().notNull().default(''),
  localpath: text().notNull().default(''),
  role: text().notNull().default(''),
  payment: text().notNull().default(''),
  apcEntries: jsonb().$type<ApcEntry[]>().notNull().default(sql`'[]'::jsonb`),
  fin: jsonb().$type<Fin | null>(),
  history: jsonb().$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
  position: doublePrecision().notNull().default(0),
  createdAt: now(),
  updatedAt: now(),
})

export const authors = pgTable('authors', {
  id: serial().primaryKey(),
  name: text().notNull(),
  title: text().notNull().default(''),
  unit: text().notNull().default(''),
  email: text().notNull().default(''),
  orcid: text().notNull().default(''),
  bank: text().notNull().default(''),
  note: text().notNull().default(''),
})

export const journals = pgTable('journals', {
  id: serial().primaryKey(),
  name: text().notNull(),
  rank: text().notNull().default(''),
  publisher: text().notNull().default(''),
  issn: text().notNull().default(''),
  impact: text().notNull().default(''),
  country: text().notNull().default(''),
  web: text().notNull().default(''),
  fee: text().notNull().default(''),
  note: text().notNull().default(''),
})

export const conferences = pgTable('conferences', {
  id: serial().primaryKey(),
  name: text().notNull(),
  rank: text().notNull().default(''),
  location: text().notNull().default(''),
  deadline: text().notNull().default(''),
  confdate: text().notNull().default(''),
  fee: integer().notNull().default(0),
  feeText: text().notNull().default(''),
  web: text().notNull().default(''),
  note: text().notNull().default(''),
})

export const specialIssues = pgTable('special_issues', {
  id: serial().primaryKey(),
  name: text().notNull(),
  journal: text().notNull().default(''),
  rank: text().notNull().default(''),
  deadline: text().notNull().default(''),
  type: text().notNull().default('Special Issue'),
  note: text().notNull().default(''),
})

export const rewardCategories = pgTable('reward_categories', {
  id: serial().primaryKey(),
  name: text().notNull(),
  abbr: text().notNull().default(''),
  group: text().notNull().default(''),
  amount: integer().notNull().default(0),
  issn: text().notNull().default(''),
  note: text().notNull().default(''),
})

// Single-row table (id is pinned to 1): the dashboard sticky note.
export const dashboardNote = pgTable('dashboard_note', {
  id: integer().primaryKey().default(1),
  body: text().notNull().default(''),
  sign: text().notNull().default(''),
  updatedAt: now(),
})

export const attachments = pgTable('attachments', {
  id: serial().primaryKey(),
  paperId: integer()
    .notNull()
    .references(() => papers.id, { onDelete: 'cascade' }),
  filename: text().notNull(),
  contentType: text().notNull().default('application/octet-stream'),
  size: bigint({ mode: 'number' }).notNull().default(0),
  storageKey: text().notNull(),
  createdAt: now(),
})

export type PaperRow = typeof papers.$inferSelect
export type PaperInsert = typeof papers.$inferInsert
export type AuthorRow = typeof authors.$inferSelect
export type JournalRow = typeof journals.$inferSelect
export type ConferenceRow = typeof conferences.$inferSelect
export type SpecialIssueRow = typeof specialIssues.$inferSelect
export type RewardCategoryRow = typeof rewardCategories.$inferSelect
export type DashboardNoteRow = typeof dashboardNote.$inferSelect
export type AttachmentRow = typeof attachments.$inferSelect
