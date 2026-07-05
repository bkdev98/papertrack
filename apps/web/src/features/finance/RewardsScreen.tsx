import { ScreenHeader, SectionRule } from '@/components/ui'
import { useRewardCategories } from '@/lib/queries'
import type { RewardCategory } from '@papertrack/shared'
import { REWARD_GROUP_ORDER, formatMoney } from '@papertrack/shared'

const FOOTNOTE =
  'Mức thưởng chia đều theo số tác giả thuộc trường; phân loại của bài báo quyết định danh mục áp dụng.'

/** Group categories, ordered by the reward-regulation group order (extras last). */
function groupCategories(cats: RewardCategory[]): [string, RewardCategory[]][] {
  const byGroup = new Map<string, RewardCategory[]>()
  for (const c of cats) {
    const g = c.group || 'Khác'
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(c)
  }
  const ordered: [string, RewardCategory[]][] = []
  for (const g of REWARD_GROUP_ORDER) {
    if (byGroup.has(g)) {
      ordered.push([g, byGroup.get(g)!])
      byGroup.delete(g)
    }
  }
  for (const [g, list] of byGroup) ordered.push([g, list])
  return ordered
}

export function RewardsScreen() {
  const { data: cats } = useRewardCategories()
  const groups = groupCategories(cats ?? [])

  return (
    <div className="animate-pt-page mx-auto max-w-[920px]">
      <ScreenHeader
        watermark="K"
        eyebrow="Biểu khen thưởng"
        caption="theo Quy chế chi tiêu nội bộ 2026"
      />

      {!cats ? (
        <p className="py-24 text-center font-serif text-[14px] italic text-muted">Đang mở sổ…</p>
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {groups.map(([group, list], gi) => (
              <section
                key={group}
                className="animate-pt-fade"
                style={{ animationDelay: `${0.08 + gi * 0.06}s` }}
              >
                <div className="font-mono text-[9.5px] uppercase tracking-[1.6px] text-seal">
                  {group}
                </div>
                <SectionRule className="!bg-seal/70" delay={0.2 + gi * 0.06} />
                <div className="mt-3 flex flex-col">
                  {list.map((c) => (
                    <div
                      key={c.id}
                      className="grid grid-cols-[90px_1fr_160px] items-center gap-3 border-b border-rule py-2.5 max-sm:my-1.5 max-sm:flex max-sm:flex-col max-sm:items-start max-sm:gap-2 max-sm:rounded-[4px] max-sm:border max-sm:border-rule-2 max-sm:bg-paper-card max-sm:p-3.5 max-sm:shadow-[0_1px_2px_rgba(34,29,20,0.05)]"
                    >
                      <div className="contents max-sm:flex max-sm:min-w-0 max-sm:items-baseline max-sm:gap-2">
                        <span className="inline-flex w-fit items-center justify-center rounded-[2px] border border-line-chip bg-paper-abbr px-1.5 py-px font-mono text-[10.5px] text-ink-rank">
                          {c.abbr || '—'}
                        </span>
                        <span className="font-serif text-[14.5px] text-ink">{c.name}</span>
                      </div>
                      <div className="contents max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1.5">
                        <span className="text-right font-mono text-[11.5px] tabular-nums text-ink max-sm:text-left max-sm:justify-self-auto">
                          <span className="hidden max-sm:mr-1 max-sm:inline font-mono text-[8px] uppercase tracking-[1px] text-faint">
                            KHEN THƯỞNG{' '}
                          </span>
                          {formatMoney(c.amount)} ₫
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-9 font-serif text-[13px] italic leading-normal text-faint">{FOOTNOTE}</p>
        </>
      )}
    </div>
  )
}
