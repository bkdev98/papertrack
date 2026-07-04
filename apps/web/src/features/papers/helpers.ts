import {
  type Aging,
  type GroupKey,
  type Paper,
  agingFor,
  initials,
  statusGroup,
} from '@papertrack/shared'

/** Screen-header eyebrow per papers group. */
export const PAPERS_HEADING: Record<GroupKey, string> = {
  inprocess: 'Sổ theo dõi — đang xử lý',
  finished: 'Sổ theo dõi — hoàn thành',
  rejected: 'Sổ theo dõi — từ chối',
  all: 'Sổ theo dõi — tất cả hồ sơ',
}

/** Search match against title / venue / authors (all lowercased; `needle` pre-lowercased). */
export function matchesQuery(p: Paper, needle: string): boolean {
  if (!needle) return true
  return (
    p.title.toLowerCase().includes(needle) ||
    p.venue.toLowerCase().includes(needle) ||
    p.authors.some((a) => a.toLowerCase().includes(needle))
  )
}

/** Comma-joined author initials, e.g. ["Bui Thanh Khoa"] → "B.T. Khoa". */
export function authorsShort(authors: string[]): string {
  return authors.map(initials).join(', ')
}

/**
 * Aging line — surfaced only for in-process papers.
 * Reference date = history[status] || date.
 */
export function agingOf(p: Paper): Aging | null {
  if (statusGroup(p.status) !== 'inprocess') return null
  return agingFor(p.history?.[p.status] || p.date)
}
