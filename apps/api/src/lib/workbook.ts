/**
 * Excel export — renders the full PaperTrack dataset as a styled .xlsx workbook.
 *
 * One sheet per section of the app, mirroring the ledger: an overview summary,
 * the papers ledger, the catalog directories, the internal settlement, the cost
 * line-items, and the reward-rate table. Money is written as real numbers with a
 * VND number format (so Excel can sum/sort them), dates as real dates.
 *
 * All aggregates reuse the pure functions in `@papertrack/shared` — the same
 * source of truth the dashboard and settlement screens render from.
 */
import {
  type Author,
  type Conference,
  GROUPS,
  type Journal,
  type OverviewStats,
  type Paper,
  type RewardCategory,
  type SettleKind,
  type Settlement,
  type SpecialIssue,
  computeOverview,
  computeSettlement,
  formatDateDots,
  paperTotal,
  parseVnDate,
  rewardAmountFor,
  rewardEligible,
  statusGroup,
} from '@papertrack/shared'
// exceljs is CommonJS: under real Node ESM only the default (whole module.exports)
// exposes the classes — named imports fail at runtime (cjs-module-lexer can't see
// them). Import the value via default, the instance types via `import type`.
import ExcelJS from 'exceljs'
import type { Workbook, Worksheet } from 'exceljs'

/** The v3 bundle this workbook renders (the `/data/export` shape). */
export interface WorkbookData {
  papers: Paper[]
  journals: Journal[]
  conferences: Conference[]
  specialIssues: SpecialIssue[]
  authors: Author[]
  rewardCategories: RewardCategory[]
}

// ─── Palette + formats (toned to the archival-ledger look) ───────────────────
const HEADER_FILL = 'FF2A2A28' // ink
const HEADER_TEXT = 'FFF5F0E6' // paper
const HEADER_RULE = 'FFA3382B' // seal red
const VND = '#,##0" ₫"'
const DATE = 'dd/mm/yyyy'

type CellVal = string | number | Date | null

interface Column<T> {
  header: string
  width: number
  numFmt?: string
  value: (row: T, index: number) => CellVal
}

// ─── Sheet helpers ───────────────────────────────────────────────────────────
function styleHeaderRow(ws: Worksheet): void {
  const header = ws.getRow(1)
  header.height = 24
  header.font = { bold: true, size: 11, color: { argb: HEADER_TEXT } }
  header.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.border = { bottom: { style: 'medium', color: { argb: HEADER_RULE } } }
  })
}

/** Add a frozen-header sheet driven by a column spec. */
function sheetFrom<T>(wb: Workbook, name: string, columns: Column<T>[], rows: T[]): void {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = columns.map((c, i) => ({
    header: c.header,
    key: `c${i}`,
    width: c.width,
    style: c.numFmt ? { numFmt: c.numFmt } : {},
  }))
  for (const [i, row] of rows.entries()) {
    ws.addRow(columns.map((c) => c.value(row, i) ?? ''))
  }
  styleHeaderRow(ws)
}

/** ISO/DD-MM date string → a real Date cell (blank when unparseable/empty).
 *  Excel stores dates as timezone-naive serials and exceljs derives the serial
 *  from `Date.getTime()` (UTC). `parseVnDate` returns a *local*-midnight Date, so
 *  on a server east of UTC its UTC instant lands on the previous calendar day and
 *  Excel would show the date off by one. Pin to UTC midnight of the same calendar
 *  day so the displayed date is correct regardless of server timezone. */
function dateCell(raw: string | null | undefined): Date | string {
  const d = parseVnDate(raw)
  if (!d) return ''
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

/** The status timeline (history map) as a compact, chronologically-ordered text
 *  cell: "Nộp bài: 04.06.2025 · Chấp nhận: 12.09.2025". Plain text, not a Date. */
function historyCell(history: Record<string, string> | null | undefined): string {
  return Object.entries(history ?? {})
    .sort(([, a], [, b]) => (parseVnDate(a)?.getTime() ?? 0) - (parseVnDate(b)?.getTime() ?? 0))
    .map(([status, date]) => `${status}: ${formatDateDots(date)}`)
    .join(' · ')
}

// ─── Tổng quan (overview + settlement summary) ───────────────────────────────
interface Metric {
  label: string
  value: CellVal
  numFmt?: string
}

function overviewSheet(wb: Workbook, o: OverviewStats, s: Settlement): void {
  const metrics: Metric[] = [
    { label: 'Tổng số hồ sơ', value: o.total },
    { label: 'Bài tạp chí', value: o.journalCount },
    { label: 'Bài hội thảo', value: o.confCount },
    { label: 'Đang xử lý', value: o.inprocCount },
    { label: 'Hoàn thành', value: o.finishedCount },
    { label: 'Từ chối', value: o.rejectedCount },
    { label: 'Đã công bố', value: o.published },
    { label: 'Tỷ lệ công bố', value: o.pubPct, numFmt: '0"%"' },
    { label: 'Hạng Q1', value: o.q1 },
    { label: 'Hạng Q2', value: o.q2 },
    { label: 'Q1 + Q2', value: o.q12 },
    { label: 'Thưởng dự kiến', value: o.rewardEst, numFmt: VND },
    { label: 'Tổng chi phí', value: o.spent, numFmt: VND },
    { label: 'Hiệu quả (ROI)', value: Number(o.roiX.toFixed(1)), numFmt: '0.0"×"' },
    { label: 'Phí chưa thanh toán', value: o.unpaid.amount, numFmt: VND },
    { label: 'Số khoản phí chưa trả', value: o.unpaid.count },
    { label: `Bài năm ${o.yearNow.year}`, value: o.yearNow.count },
    { label: `Bài năm ${o.yearPrev.year}`, value: o.yearPrev.count },
    { label: 'Quyết toán — phải thu', value: s.collect.amount, numFmt: VND },
    { label: 'Quyết toán — phải chi', value: s.pay.amount, numFmt: VND },
  ]

  const ws = wb.addWorksheet('Tổng quan', { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = [
    { header: 'Chỉ số', key: 'k', width: 34 },
    { header: 'Giá trị', key: 'v', width: 22 },
  ]
  for (const m of metrics) {
    const row = ws.addRow([m.label, m.value])
    if (m.numFmt) row.getCell(2).numFmt = m.numFmt
  }
  styleHeaderRow(ws)
}

// ─── Bài báo (papers ledger) ─────────────────────────────────────────────────
function paperColumns(rc: RewardCategory[]): Column<Paper>[] {
  return [
    { header: 'STT', width: 6, value: (_p, i) => i + 1 },
    { header: 'Mã', width: 7, value: (p) => p.id },
    { header: 'Tiêu đề', width: 48, value: (p) => p.title },
    { header: 'Loại', width: 10, value: (p) => p.type },
    { header: 'Nơi công bố', width: 28, value: (p) => p.venue },
    { header: 'Hạng', width: 16, value: (p) => p.rank },
    { header: 'Trạng thái', width: 15, value: (p) => p.status },
    { header: 'Nhóm', width: 13, value: (p) => GROUPS[statusGroup(p.status)].label },
    { header: 'Ngày', width: 12, numFmt: DATE, value: (p) => dateCell(p.date) },
    { header: 'Lịch sử', width: 42, value: (p) => historyCell(p.history) },
    { header: 'Vai trò', width: 18, value: (p) => p.role },
    { header: 'Tác giả', width: 34, value: (p) => (p.authors ?? []).join(', ') },
    { header: 'Số TG', width: 7, value: (p) => (p.authors ?? []).length },
    { header: 'Phí APC', width: 14, numFmt: VND, value: (p) => p.costs?.apc ?? 0 },
    { header: 'Phí hội thảo', width: 14, numFmt: VND, value: (p) => p.costs?.conf ?? 0 },
    { header: 'Phí khác', width: 14, numFmt: VND, value: (p) => p.costs?.other ?? 0 },
    { header: 'Tổng chi phí', width: 15, numFmt: VND, value: (p) => paperTotal(p) },
    { header: 'Thanh toán', width: 12, value: (p) => p.payment || '' },
    {
      header: 'Thưởng dự kiến',
      width: 16,
      numFmt: VND,
      value: (p) => (rewardEligible(p.status) ? rewardAmountFor(p.rank, p.type, rc) : 0),
    },
    { header: 'DOI', width: 22, value: (p) => p.doi },
    { header: 'Liên kết', width: 30, value: (p) => p.publink || p.link },
    { header: 'Ghi chú', width: 40, value: (p) => p.note },
  ]
}

// ─── Catalog directories ─────────────────────────────────────────────────────
const AUTHOR_COLS: Column<Author>[] = [
  { header: 'STT', width: 6, value: (_a, i) => i + 1 },
  { header: 'Họ tên', width: 26, value: (a) => a.name },
  { header: 'Chức danh', width: 16, value: (a) => a.title },
  { header: 'Đơn vị', width: 26, value: (a) => a.unit },
  { header: 'Email', width: 28, value: (a) => a.email },
  { header: 'ORCID', width: 22, value: (a) => a.orcid },
  { header: 'Ngân hàng', width: 24, value: (a) => a.bank },
  { header: 'Ghi chú', width: 34, value: (a) => a.note },
]

const JOURNAL_COLS: Column<Journal>[] = [
  { header: 'STT', width: 6, value: (_j, i) => i + 1 },
  { header: 'Tên tạp chí', width: 40, value: (j) => j.name },
  { header: 'Hạng', width: 16, value: (j) => j.rank },
  { header: 'Nhà xuất bản', width: 26, value: (j) => j.publisher },
  { header: 'ISSN', width: 16, value: (j) => j.issn },
  { header: 'Impact', width: 10, value: (j) => j.impact },
  { header: 'Quốc gia', width: 16, value: (j) => j.country },
  { header: 'Website', width: 30, value: (j) => j.web },
  { header: 'Phí', width: 16, value: (j) => j.fee },
  { header: 'Ghi chú', width: 34, value: (j) => j.note },
]

const CONFERENCE_COLS: Column<Conference>[] = [
  { header: 'STT', width: 6, value: (_c, i) => i + 1 },
  { header: 'Tên hội thảo', width: 40, value: (c) => c.name },
  { header: 'Hạng', width: 14, value: (c) => c.rank },
  { header: 'Địa điểm', width: 24, value: (c) => c.location },
  { header: 'Hạn nộp', width: 12, numFmt: DATE, value: (c) => dateCell(c.deadline) },
  { header: 'Ngày tổ chức', width: 18, value: (c) => c.confdate },
  { header: 'Phí', width: 14, numFmt: VND, value: (c) => c.fee ?? 0 },
  { header: 'Phí (mô tả)', width: 20, value: (c) => c.feeText },
  { header: 'Website', width: 30, value: (c) => c.web },
  { header: 'Ghi chú', width: 34, value: (c) => c.note },
]

const SPECIAL_ISSUE_COLS: Column<SpecialIssue>[] = [
  { header: 'STT', width: 6, value: (_s, i) => i + 1 },
  { header: 'Tên', width: 40, value: (s) => s.name },
  { header: 'Tạp chí', width: 30, value: (s) => s.journal },
  { header: 'Hạng', width: 16, value: (s) => s.rank },
  { header: 'Hạn nộp', width: 12, numFmt: DATE, value: (s) => dateCell(s.deadline) },
  { header: 'Loại', width: 16, value: (s) => s.type },
  { header: 'Ghi chú', width: 34, value: (s) => s.note },
]

const REWARD_COLS: Column<RewardCategory>[] = [
  { header: 'STT', width: 6, value: (_r, i) => i + 1 },
  { header: 'Danh mục', width: 42, value: (r) => r.name },
  { header: 'Viết tắt', width: 12, value: (r) => r.abbr },
  { header: 'Nhóm', width: 26, value: (r) => r.group },
  { header: 'Mức thưởng', width: 18, numFmt: VND, value: (r) => r.amount },
  { header: 'Ghi chú', width: 30, value: (r) => r.note },
]

// ─── Quyết toán (per-author settlement) ──────────────────────────────────────
const SETTLE_KIND_LABEL: Record<SettleKind, string> = {
  collect: 'Phải thu',
  pay: 'Phải chi',
  settled: 'Đã xong',
  waiting: 'Chờ thưởng',
}

function settlementSheet(wb: Workbook, s: Settlement): void {
  const rows = s.slips.flatMap((slip) => slip.rows.map((r) => ({ slip, r })))
  sheetFrom(
    wb,
    'Quyết toán',
    [
      { header: 'Mã', width: 7, value: ({ slip }) => slip.paperId },
      { header: 'Bài báo', width: 46, value: ({ slip }) => slip.title },
      { header: 'Nơi công bố', width: 26, value: ({ slip }) => slip.venue },
      { header: 'Tác giả', width: 24, value: ({ r }) => r.author },
      { header: 'Định mức', width: 16, numFmt: VND, value: ({ r }) => r.target },
      { header: 'Đã trả', width: 16, numFmt: VND, value: ({ r }) => r.paid },
      { header: 'Còn lại', width: 16, numFmt: VND, value: ({ r }) => r.pending },
      { header: 'Trạng thái', width: 14, value: ({ r }) => SETTLE_KIND_LABEL[r.kind] },
      { header: 'Ngày trả', width: 14, numFmt: DATE, value: ({ r }) => dateCell(r.paidDate) },
    ],
    rows,
  )
}

// ─── Chi phí (APC line items) ────────────────────────────────────────────────
function costsSheet(wb: Workbook, papers: Paper[]): void {
  const rows = papers.flatMap((p) => (p.apcEntries ?? []).map((e) => ({ p, e })))
  sheetFrom(
    wb,
    'Chi phí',
    [
      { header: 'Mã', width: 7, value: ({ p }) => p.id },
      { header: 'Bài báo', width: 46, value: ({ p }) => p.title },
      { header: 'Nơi công bố', width: 26, value: ({ p }) => p.venue },
      { header: 'Mô tả', width: 30, value: ({ e }) => e.desc },
      { header: 'Người trả', width: 20, value: ({ e }) => e.payer },
      { header: 'Số tiền', width: 16, numFmt: VND, value: ({ e }) => e.amount },
      { header: 'Trạng thái', width: 12, value: ({ e }) => e.status || '' },
    ],
    rows,
  )
}

// ─── Entry point ─────────────────────────────────────────────────────────────
/** Build the full PaperTrack workbook and return it as an .xlsx buffer. */
export async function buildWorkbook(data: WorkbookData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'PaperTrack'
  wb.created = new Date()

  const overview = computeOverview(data.papers, data.rewardCategories)
  const settlement = computeSettlement(data.papers, data.rewardCategories)

  overviewSheet(wb, overview, settlement)
  sheetFrom(wb, 'Bài báo', paperColumns(data.rewardCategories), data.papers)
  sheetFrom(wb, 'Tác giả', AUTHOR_COLS, data.authors)
  sheetFrom(wb, 'Tạp chí', JOURNAL_COLS, data.journals)
  sheetFrom(wb, 'Hội thảo', CONFERENCE_COLS, data.conferences)
  sheetFrom(wb, 'Special Issue', SPECIAL_ISSUE_COLS, data.specialIssues)
  settlementSheet(wb, settlement)
  costsSheet(wb, data.papers)
  sheetFrom(wb, 'Khen thưởng', REWARD_COLS, data.rewardCategories)

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf as unknown as ArrayBuffer)
}
