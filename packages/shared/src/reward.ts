/**
 * Reward ("khen thưởng") catalogue — the IUH 2026 regulation rate table.
 * Amounts are in VND. These are the defaults shipped by the original app;
 * they live in the DB (table `reward_categories`) and are user-editable.
 */
import type { PaperType } from './vocab'

export interface RewardCategory {
  id: number
  name: string
  abbr: string
  group: string
  amount: number
  note: string
}

export const DEFAULT_REWARD_CATEGORIES: RewardCategory[] = [
  {
    id: 1,
    name: 'Bài báo WoS (SCIE/SSCI/A&HCI) Q1',
    abbr: 'WoS-Q1',
    group: 'WoS (SCIE/SSCI/A&HCI)',
    amount: 150_480_000,
    note: '',
  },
  {
    id: 2,
    name: 'Bài báo WoS (SCIE/SSCI/A&HCI) Q2',
    abbr: 'WoS-Q2',
    group: 'WoS (SCIE/SSCI/A&HCI)',
    amount: 110_880_000,
    note: '',
  },
  {
    id: 3,
    name: 'Bài báo WoS (SCIE/SSCI/A&HCI) Q3',
    abbr: 'WoS-Q3',
    group: 'WoS (SCIE/SSCI/A&HCI)',
    amount: 80_400_000,
    note: '',
  },
  {
    id: 4,
    name: 'Bài báo WoS (SCIE/SSCI/A&HCI) Q4',
    abbr: 'WoS-Q4',
    group: 'WoS (SCIE/SSCI/A&HCI)',
    amount: 60_000_000,
    note: '',
  },
  {
    id: 5,
    name: 'Bài báo Scopus Q1',
    abbr: 'Sco-Q1',
    group: 'Scopus',
    amount: 90_000_000,
    note: '',
  },
  {
    id: 6,
    name: 'Bài báo Scopus Q2',
    abbr: 'Sco-Q2',
    group: 'Scopus',
    amount: 70_200_000,
    note: '',
  },
  {
    id: 7,
    name: 'Bài báo Scopus Q3',
    abbr: 'Sco-Q3',
    group: 'Scopus',
    amount: 50_400_000,
    note: '',
  },
  {
    id: 8,
    name: 'Bài báo Scopus Q4',
    abbr: 'Sco-Q4',
    group: 'Scopus',
    amount: 20_160_000,
    note: '',
  },
  {
    id: 9,
    name: 'Bài báo ESCI/CPCI',
    abbr: 'ESCI',
    group: 'ESCI/CPCI',
    amount: 16_800_000,
    note: '',
  },
  {
    id: 10,
    name: 'Bài báo WoS chưa phân hạng',
    abbr: 'WoS-NR',
    group: 'WoS (SCIE/SSCI/A&HCI)',
    amount: 25_200_000,
    note: '',
  },
  {
    id: 11,
    name: 'Bài báo Scopus chưa phân hạng',
    abbr: 'Sco-NR',
    group: 'Scopus',
    amount: 16_800_000,
    note: '',
  },
  {
    id: 12,
    name: 'Kỷ yếu HNKH danh mục Scopus',
    abbr: 'KY-Sco',
    group: 'Hội thảo/Kỷ yếu',
    amount: 12_600_000,
    note: '',
  },
  {
    id: 13,
    name: 'Tạp chí quốc tế khác (ISSN)',
    abbr: 'TC-ISSN',
    group: 'Tạp chí trong nước',
    amount: 2_100_000,
    note: '',
  },
  {
    id: 14,
    name: 'Tạp chí KHCN IUH',
    abbr: 'IUH',
    group: 'Tạp chí trong nước',
    amount: 5_850_000,
    note: '',
  },
  {
    id: 15,
    name: 'Tạp chí trong nước khác (ISSN)',
    abbr: 'TC-VN',
    group: 'Tạp chí trong nước',
    amount: 1_800_000,
    note: '',
  },
  {
    id: 16,
    name: 'Bài toàn văn HNKH QT (ISSN/ISBN)',
    abbr: 'KY-QT',
    group: 'Hội thảo/Kỷ yếu',
    amount: 5_850_000,
    note: '',
  },
  {
    id: 17,
    name: 'Bài toàn văn HNKH trong nước',
    abbr: 'KY-VN',
    group: 'Hội thảo/Kỷ yếu',
    amount: 1_800_000,
    note: '',
  },
  {
    id: 18,
    name: 'Chương sách QT của NXB uy tín',
    abbr: 'CS-QT',
    group: 'Chương sách',
    amount: 25_500_000,
    note: '',
  },
  {
    id: 19,
    name: 'Bằng độc quyền sáng chế QT',
    abbr: 'SC-QT',
    group: 'Sở hữu trí tuệ',
    amount: 100_800_000,
    note: '',
  },
  {
    id: 20,
    name: 'Bằng độc quyền sáng chế trong nước',
    abbr: 'SC-VN',
    group: 'Sở hữu trí tuệ',
    amount: 60_000_000,
    note: '',
  },
  {
    id: 21,
    name: 'Bằng độc quyền giải pháp hữu ích',
    abbr: 'GP-HI',
    group: 'Sở hữu trí tuệ',
    amount: 28_800_000,
    note: '',
  },
  {
    id: 22,
    name: 'Thiết kế mạch, kiểu dáng công nghiệp',
    abbr: 'KDCN',
    group: 'Sở hữu trí tuệ',
    amount: 14_400_000,
    note: '',
  },
  {
    id: 23,
    name: 'Giấy chứng nhận đăng ký quyền tác giả',
    abbr: 'QTG',
    group: 'Sở hữu trí tuệ',
    amount: 4_800_000,
    note: '',
  },
]

/**
 * Resolve a paper's (rank, type) to a reward category — a faithful port of the
 * design's `_catOf(rank, type)`. Order matters and mirrors the original:
 *   1. exact abbr match (a few papers store the abbr directly in `rank`)
 *   2. conference → KY-Sco (if Scopus or has a quartile) else KY-QT
 *   3. WoS index (SSCI/SCIE/A&HCI) → WoS-Q{n} or WoS-NR
 *   4. any quartile → Sco-Q{n}
 *   5. ESCI → ESCI
 *   6. Scopus → Sco-NR
 * The first `Q[1-4]` occurrence wins (not the "best"). Returns null if nothing fits.
 */
export function matchRewardCategoryAbbr(
  rank: string | null | undefined,
  type: PaperType | string | null | undefined,
  categories: RewardCategory[] = DEFAULT_REWARD_CATEGORIES,
): string | null {
  if (!rank) return null
  if (categories.some((c) => c.abbr === rank)) return rank

  const t = String(rank).toUpperCase()
  const qm = t.match(/Q([1-4])/)
  let abbr = ''
  if (type === 'Hội thảo') abbr = t.includes('SCOPUS') || qm ? 'KY-Sco' : 'KY-QT'
  else if (/SSCI|SCIE|A&HCI/.test(t)) abbr = qm ? `WoS-Q${qm[1]}` : 'WoS-NR'
  else if (qm) abbr = `Sco-Q${qm[1]}`
  else if (t.includes('ESCI')) abbr = 'ESCI'
  else if (t.includes('SCOPUS')) abbr = 'Sco-NR'

  return categories.some((c) => c.abbr === abbr) ? abbr : null
}

export function matchRewardCategory(
  rank: string | null | undefined,
  type: PaperType | string | null | undefined,
  categories: RewardCategory[] = DEFAULT_REWARD_CATEGORIES,
): RewardCategory | null {
  const abbr = matchRewardCategoryAbbr(rank, type, categories)
  return abbr ? (categories.find((c) => c.abbr === abbr) ?? null) : null
}

export function rewardAmountFor(
  rank: string | null | undefined,
  type: PaperType | string | null | undefined,
  categories: RewardCategory[] = DEFAULT_REWARD_CATEGORIES,
): number {
  return matchRewardCategory(rank, type, categories)?.amount ?? 0
}

/** Group order for the reward table (matches the seed's section ordering). */
export const REWARD_GROUP_ORDER = [
  'WoS (SCIE/SSCI/A&HCI)',
  'Scopus',
  'ESCI/CPCI',
  'Hội thảo/Kỷ yếu',
  'Tạp chí trong nước',
  'Chương sách',
  'Sở hữu trí tuệ',
]
