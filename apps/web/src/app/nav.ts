import type { GroupKey } from '@papertrack/shared'

// ─── Slug ↔ key maps ─────────────────────────────────────────────────────────
export const PAPER_GROUP_SLUGS: Record<string, GroupKey> = {
  'dang-xu-ly': 'inprocess',
  'hoan-thanh': 'finished',
  'tu-choi': 'rejected',
  'tat-ca': 'all',
}
export const PAPER_GROUP_SLUG_OF: Record<GroupKey, string> = {
  inprocess: 'dang-xu-ly',
  finished: 'hoan-thanh',
  rejected: 'tu-choi',
  all: 'tat-ca',
}

export type CatalogKind = 'journals' | 'conferences' | 'specialIssues' | 'authors'
export const CATALOG_SLUGS: Record<string, CatalogKind> = {
  'tap-chi': 'journals',
  'hoi-thao': 'conferences',
  'special-issue': 'specialIssues',
  'tac-gia': 'authors',
}
export const CATALOG_SLUG_OF: Record<CatalogKind, string> = {
  journals: 'tap-chi',
  conferences: 'hoi-thao',
  specialIssues: 'special-issue',
  authors: 'tac-gia',
}

export type FinanceKind = 'settle' | 'costs' | 'rewards'
export const FINANCE_SLUGS: Record<string, FinanceKind> = {
  'thu-chi': 'settle',
  'so-chi-phi': 'costs',
  'khen-thuong': 'rewards',
}
export const FINANCE_SLUG_OF: Record<FinanceKind, string> = {
  settle: 'thu-chi',
  costs: 'so-chi-phi',
  rewards: 'khen-thuong',
}

export const PATHS = {
  overview: '/',
  papers: (slug = 'dang-xu-ly') => `/so-bai-bao/${slug}`,
  catalog: (slug = 'tap-chi') => `/danh-muc/${slug}`,
  finance: (slug = 'thu-chi') => `/tai-chinh/${slug}`,
  notifications: '/thong-bao',
  data: '/du-lieu',
}

export type SubCountKey =
  | 'inprocess'
  | 'finished'
  | 'rejected'
  | 'all'
  | 'journals'
  | 'conferences'
  | 'specialIssues'
  | 'authors'

export interface NavChild {
  label: string
  to: string
  countKey?: SubCountKey
}
export interface NavTab {
  key: string
  label: string
  to: string
  match: string // path prefix that marks this tab active
  badge?: 'papers' | 'finance' | 'notif'
  children?: NavChild[]
}

export const NAV_TABS: NavTab[] = [
  { key: 'overview', label: 'Tổng quan', to: PATHS.overview, match: '/', children: undefined },
  {
    key: 'papers',
    label: 'Sổ bài báo',
    to: PATHS.papers(),
    match: '/so-bai-bao',
    badge: 'papers',
    children: [
      { label: 'Đang xử lý', to: PATHS.papers('dang-xu-ly'), countKey: 'inprocess' },
      { label: 'Hoàn thành', to: PATHS.papers('hoan-thanh'), countKey: 'finished' },
      { label: 'Từ chối', to: PATHS.papers('tu-choi'), countKey: 'rejected' },
      { label: 'Tất cả hồ sơ', to: PATHS.papers('tat-ca'), countKey: 'all' },
    ],
  },
  {
    key: 'catalog',
    label: 'Danh mục',
    to: PATHS.catalog(),
    match: '/danh-muc',
    children: [
      { label: 'Tạp chí', to: PATHS.catalog('tap-chi'), countKey: 'journals' },
      { label: 'Hội thảo', to: PATHS.catalog('hoi-thao'), countKey: 'conferences' },
      { label: 'Special Issue', to: PATHS.catalog('special-issue'), countKey: 'specialIssues' },
      { label: 'Tác giả', to: PATHS.catalog('tac-gia'), countKey: 'authors' },
    ],
  },
  {
    key: 'finance',
    label: 'Tài chính',
    to: PATHS.finance(),
    match: '/tai-chinh',
    badge: 'finance',
    children: [
      { label: 'Thu chi nội bộ', to: PATHS.finance('thu-chi') },
      { label: 'Sổ chi phí', to: PATHS.finance('so-chi-phi') },
      { label: 'Khen thưởng', to: PATHS.finance('khen-thuong') },
    ],
  },
  {
    key: 'notifications',
    label: 'Thông báo',
    to: PATHS.notifications,
    match: '/thong-bao',
    badge: 'notif',
  },
  { key: 'data', label: 'Dữ liệu', to: PATHS.data, match: '/du-lieu' },
]
