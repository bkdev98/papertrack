import { Avatar, Button, ScreenHeader, Tally } from '@/components/ui'
import { useAuthors, usePapers, useRewardCategories } from '@/lib/queries'
import {
  type Author,
  DEFAULT_REWARD_CATEGORIES,
  type Paper,
  matchRewardCategory,
  money,
  pad,
  pipelineIndex,
  statusGroup,
} from '@papertrack/shared'
import { useCatalog } from './catalog-context'

const GRID = '32px 1.3fr 1fr 80px 170px'

export function AuthorsScreen() {
  const { openDetail, openCreate } = useCatalog()
  const authors = useAuthors().data ?? []
  const papers = usePapers().data ?? []
  const cats = useRewardCategories().data ?? DEFAULT_REWARD_CATEGORIES

  const mineOf = (a: Author) => papers.filter((p) => (p.authors ?? []).includes(a.name))

  return (
    <div className="animate-pt-page">
      <ScreenHeader
        watermark="A"
        eyebrow="Danh bạ tác giả"
        caption={`${authors.length} tác giả · 1 vạch = 1 bài`}
      >
        <Button variant="ghost-red" size="sm" className="!text-[9.5px]" onClick={openCreate}>
          + Thêm tác giả
        </Button>
      </ScreenHeader>

      {/* Header + rows share one scroller so the ledger columns stay aligned on narrow screens */}
      <div className="no-scrollbar sm:max-lg:overflow-x-auto">
        <div className="sm:max-lg:min-w-[560px]">
          {/* Header */}
          <div
            className="grid animate-pt-up gap-[14px] border-b border-rule-2 px-1.5 pb-2 pt-2.5 font-mono text-[9px] uppercase tracking-[1.4px] text-faint max-sm:hidden"
            style={{ gridTemplateColumns: GRID, animationDelay: '0.08s' }}
          >
            <span>№</span>
            <span>Tác giả — đơn vị</span>
            <span>Kiểm đếm bài</span>
            <span>Q1/Q2</span>
            <span className="text-right">Khen thưởng ước tính</span>
          </div>

          {/* Rows */}
          <div className="flex animate-pt-up flex-col" style={{ animationDelay: '0.14s' }}>
            {authors.map((a, i) => {
              const mine = mineOf(a)
              const active = mine.filter((p: Paper) => statusGroup(p.status) !== 'rejected')
              const q12 = active.filter(
                (p) => (p.rank ?? '').includes('Q1') || (p.rank ?? '').includes('Q2'),
              ).length
              const reward = papers
                .filter((p) => pipelineIndex(p.status) >= 4 && (p.authors ?? []).includes(a.name))
                .reduce((t, p) => {
                  const c = matchRewardCategory(p.rank, p.type, cats)
                  return t + (c ? c.amount / Math.max((p.authors ?? []).length, 1) : 0)
                }, 0)
              return (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => openDetail(a.id)}
                  className="grid items-center gap-[14px] border-b border-rule-2 px-1.5 py-3 text-left transition-colors hover:bg-[rgba(163,56,43,0.05)] max-sm:flex max-sm:flex-col max-sm:gap-2 max-sm:rounded-[4px] max-sm:border max-sm:border-rule-2 max-sm:bg-paper-card max-sm:my-1.5 max-sm:p-3.5 max-sm:shadow-[0_1px_2px_rgba(34,29,20,0.05)]"
                  style={{ gridTemplateColumns: GRID }}
                >
                  <div className="contents max-sm:flex max-sm:min-w-0 max-sm:items-baseline max-sm:gap-2">
                    <span className="font-mono text-[11px] text-faint">{pad(i + 1)}</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={a.name} size={38} framed />
                      <span className="min-w-0">
                        <span className="block truncate font-serif text-[15.5px] font-medium text-ink max-sm:overflow-visible max-sm:whitespace-normal">
                          {a.title ? `${a.title} ` : ''}
                          {a.name}
                        </span>
                        <span className="mt-px block truncate font-serif text-[12.5px] italic text-muted max-sm:overflow-visible max-sm:whitespace-normal">
                          {a.unit}
                          {a.email ? ` · ${a.email}` : ''}
                        </span>
                      </span>
                    </span>
                  </div>
                  <div className="contents max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1.5">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 max-sm:w-full">
                      <Tally count={active.length} height={15} />
                      <span className="font-mono text-[10.5px] text-faint">
                        <span className="hidden max-sm:mr-1 max-sm:inline font-mono text-[8px] uppercase tracking-[1px] text-faint">
                          BÀI{' '}
                        </span>
                        {active.length}
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-ink">
                      <span className="hidden max-sm:mr-1 max-sm:inline font-mono text-[8px] uppercase tracking-[1px] text-faint">
                        Q1/Q2{' '}
                      </span>
                      {q12}
                    </span>
                    <span className="justify-self-end font-mono text-[11.5px] text-ink max-sm:text-left max-sm:justify-self-auto">
                      <span className="hidden max-sm:mr-1 max-sm:inline font-mono text-[8px] uppercase tracking-[1px] text-faint">
                        KHEN THƯỞNG{' '}
                      </span>
                      {money(Math.round(reward))}
                    </span>
                  </div>
                </button>
              )
            })}
            {!authors.length && (
              <div className="px-1.5 py-8 font-serif text-[13px] italic text-faint">
                Chưa có tác giả nào trong danh bạ.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
