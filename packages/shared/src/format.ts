/** Formatting + date helpers shared by API and web. Locale: vi-VN.
 *  Money/date formatters are faithful ports of the design's `_money`,
 *  `_moneySplit`, `_fmtD`, `_daysTo`, `_initials`. */

/** Parse an ISO "YYYY-MM-DD" (or "DD/MM/YYYY") string to a Date, or null. */
export function parseVnDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s) return null
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
    return Number.isNaN(d.getTime()) ? null : d
  }
  const fallback = new Date(s)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

/** `_daysTo`: whole days from now until `iso` end-of-day. Negative = overdue. */
export function daysUntil(
  date: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  const d = typeof date === 'string' ? parseVnDate(date) : date
  if (!d) return null
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000)
}

/** Whole days since `date`. Positive = in the past. */
export function daysSince(
  date: Date | string | null | undefined,
  now: Date = new Date(),
): number | null {
  const d = typeof date === 'string' ? parseVnDate(date) : date
  if (!d) return null
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000)
}

/** A submission "drags" ("— lâu!") once it has waited past this many days. */
export const AGING_LONG_DAYS = 75

export interface Aging {
  days: number
  long: boolean
  label: string // "chờ 215 ng" (+ " — lâu!" when long)
}

/** Aging for a paper. `refDate` = history[status] || date. Caller gates to in-process. */
export function agingFor(
  refDate: Date | string | null | undefined,
  now: Date = new Date(),
): Aging | null {
  const raw = daysSince(refDate, now)
  if (raw == null) return null
  const days = Math.max(0, raw)
  const long = days > AGING_LONG_DAYS
  return { days, long, label: `chờ ${days} ng${long ? ' — lâu!' : ''}` }
}

const vnNum = new Intl.NumberFormat('vi-VN')

/** Grouped number without unit: 150480000 → "150.480.000". */
export function formatMoney(n: number | null | undefined): string {
  return vnNum.format(Math.round(n ?? 0))
}

/** `_money`: "0 ₫" · "3,32 tỷ ₫" · "126,5 tr ₫" · "1.800.000 ₫". */
export function money(n: number | null | undefined): string {
  const v = n ?? 0
  if (!v) return '0 ₫'
  if (v >= 1e9) return `${(v / 1e9).toFixed(2).replace('.', ',')} tỷ ₫`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace('.', ',').replace(',0', '')} tr ₫`
  return `${vnNum.format(Math.round(v))} ₫`
}

/** `_moneySplit`: value/unit for big display numerals. */
export function moneySplit(n: number | null | undefined): { v: string; u: string } {
  const v = n ?? 0
  if (v >= 1e9) return { v: (v / 1e9).toFixed(2).replace('.', ','), u: 'tỷ ₫' }
  if (v >= 1e6) return { v: (v / 1e6).toFixed(1).replace('.', ',').replace(',0', ''), u: 'tr ₫' }
  return { v: String(Math.round(v / 1000)), u: 'k ₫' }
}

/** Parse a money string like "150.480.000" or "7500000" → number. */
export function parseMoney(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return Math.round(raw)
  if (!raw) return 0
  const digits = String(raw).replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

const vnDateLong = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "Thứ Sáu, 3 tháng 7, 2026" — masthead date, first letter capitalized. */
export function formatDateLong(date: Date = new Date()): string {
  return capitalize(vnDateLong.format(date))
}

/** `_fmtD`: "2026-07-15" → "15.07.2026"; falsy → "—". */
export function formatDateDots(date: Date | string | null | undefined): string {
  const d = typeof date === 'string' ? parseVnDate(date) : date
  if (!d) return '—'
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** "ngày 03 tháng 07 năm 2026" — signature line in the paper modal. */
export function formatDateSigned(date: Date = new Date()): string {
  return `ngày ${pad(date.getDate())} tháng ${pad(date.getMonth() + 1)} năm ${date.getFullYear()}`
}

export function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** `_initials`: "Bui Thanh Khoa" → "B.T. Khoa". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return name
  const last = parts.pop() as string
  return `${parts.map((p) => `${p.charAt(0)}.`).join('')} ${last}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

/** YYYY-MM prefix of an ISO date (for the 12-month sparkline bucketing). */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}
