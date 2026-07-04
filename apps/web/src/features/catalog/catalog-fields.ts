import type { CatalogKind } from '@/app/nav'

/** One numbered field in the generic catalog modal (§5.4 / §7 gDefs). */
export type FieldKind = 'text' | 'date' | 'select'

export interface CatalogFieldDef {
  key: string
  label: string
  kind: FieldKind
  placeholder?: string
  options?: readonly string[]
}

export interface CatalogFormDef {
  /** Modal title when adding. */
  title: string
  /** Modal title when editing an existing record. */
  editTitle: string
  sub: string
  fields: readonly CatalogFieldDef[]
}

/** Field defs + titles per catalog kind — verbatim from design §7 (`gDefs`, `gEditTitles`). */
export const CATALOG_FORMS: Record<CatalogKind, CatalogFormDef> = {
  journals: {
    title: 'Thêm tạp chí vào danh mục',
    editTitle: 'Sửa thông tin tạp chí',
    sub: 'sổ danh mục tạp chí',
    fields: [
      { key: 'name', label: 'Tên tạp chí *', kind: 'text', placeholder: 'IEEE Access…' },
      { key: 'publisher', label: 'Nhà xuất bản', kind: 'text', placeholder: 'Elsevier, Springer…' },
      { key: 'rank', label: 'Hạng', kind: 'text', placeholder: 'WoS-Q1, Sco-Q2…' },
      { key: 'issn', label: 'ISSN', kind: 'text', placeholder: '0000-0000' },
      { key: 'impact', label: 'Impact Factor', kind: 'text', placeholder: '5.2' },
      { key: 'country', label: 'Quốc gia', kind: 'text', placeholder: 'Hà Lan…' },
    ],
  },
  conferences: {
    title: 'Thêm hội thảo vào lịch',
    editTitle: 'Sửa thông tin hội thảo',
    sub: 'lịch hội thảo khoa học',
    fields: [
      {
        key: 'name',
        label: 'Tên hội thảo *',
        kind: 'text',
        placeholder: 'RIVF 2027 — Hội nghị CNTT…',
      },
      { key: 'location', label: 'Địa điểm', kind: 'text', placeholder: 'Đà Nẵng, Bangkok…' },
      { key: 'deadline', label: 'Hạn nộp bài', kind: 'date' },
      { key: 'confdate', label: 'Ngày diễn ra', kind: 'date' },
      { key: 'fee', label: 'Phí tham dự (₫)', kind: 'text', placeholder: '9500000' },
      { key: 'rank', label: 'Hạng kỷ yếu', kind: 'text', placeholder: 'KY-Sco, KY-QT…' },
    ],
  },
  specialIssues: {
    title: 'Thêm Special Issue',
    editTitle: 'Sửa Special Issue',
    sub: 'lời mời đang mở',
    fields: [
      { key: 'name', label: 'Tên số đặc biệt *', kind: 'text', placeholder: 'AI for…' },
      {
        key: 'journal',
        label: 'Tạp chí / NXB',
        kind: 'text',
        placeholder: 'Applied Soft Computing…',
      },
      { key: 'rank', label: 'Hạng', kind: 'text', placeholder: 'WoS-Q1…' },
      { key: 'deadline', label: 'Hạn nộp', kind: 'date' },
      { key: 'type', label: 'Loại', kind: 'select', options: ['Special Issue', 'Book Chapter'] },
    ],
  },
  authors: {
    title: 'Thêm tác giả vào danh bạ',
    editTitle: 'Sửa thông tin tác giả',
    sub: 'danh bạ tác giả của khoa',
    fields: [
      { key: 'name', label: 'Họ và tên *', kind: 'text', placeholder: 'Nguyễn Văn A…' },
      { key: 'title', label: 'Học hàm / học vị', kind: 'text', placeholder: 'TS., PGS. TS.…' },
      { key: 'unit', label: 'Đơn vị', kind: 'text', placeholder: 'Khoa CNTT…' },
      { key: 'email', label: 'Email', kind: 'text', placeholder: 'nva@iuh.edu.vn' },
      { key: 'orcid', label: 'ORCID', kind: 'text', placeholder: '0000-0000-0000-0000' },
      {
        key: 'bank',
        label: 'Tài khoản ngân hàng',
        kind: 'text',
        placeholder: '0123456789 — Vietcombank',
      },
    ],
  },
}

/** Host name of a website URL, `www.` stripped — the publisher/website fallback. */
export function hostOf(web: string | null | undefined): string {
  if (!web) return ''
  try {
    return new URL(web).host.replace('www.', '')
  } catch {
    return web
  }
}
