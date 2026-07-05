import { useOverlays } from '@/app/overlays'
import { Pager, ProgressDots, RankChip, StatusStamp } from '@/components/ui'
import { usePaperMutations } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { type Paper, formatDateDots, parseVnDate, pipelineIndex } from '@papertrack/shared'
import { useMemo, useState } from 'react'
import { AdvanceArrow } from './PaperCard'
import { agingOf, authorsShort } from './helpers'

const PAGE_SIZE = 12
const LEDGER_COLS = '32px 1fr 136px 64px 140px 88px'

type SortKey = 'title' | 'rank' | 'status' | 'date'
type SortState = { key: SortKey | null; dir: 'asc' | 'desc' }

const HEADERS: { key: SortKey | null; label: string; align?: 'right' }[] = [
  { key: null, label: '№' },
  { key: 'title', label: 'Bài báo — tạp chí / hội thảo' },
  { key: null, label: 'Tác giả' },
  { key: 'rank', label: 'Hạng' },
  { key: 'status', label: 'Tiến độ' },
  { key: 'date', label: 'Ngày nộp', align: 'right' },
]

function compare(a: Paper, b: Paper, key: SortKey): number {
  switch (key) {
    case 'title':
      return a.title.localeCompare(b.title, 'vi')
    case 'rank':
      // Missing ranks sort last.
      return (a.rank || '￿').localeCompare(b.rank || '￿', 'vi')
    case 'status':
      return pipelineIndex(a.status) - pipelineIndex(b.status)
    case 'date':
      return (parseVnDate(a.date)?.getTime() ?? 0) - (parseVnDate(b.date)?.getTime() ?? 0)
  }
}

export function PaperLedger({ papers }: { papers: Paper[] }) {
  const { openPaperDetail, openCreatePaper } = useOverlays()
  const { advance } = usePaperMutations()
  const [sort, setSort] = useState<SortState>({ key: null, dir: 'asc' })
  const [page, setPage] = useState(0)

  // Reset to the first page whenever the filtered set changes — done during
  // render (React's adjust-state-on-prop-change pattern) so the page never
  // paints out of range for the new list.
  const [prevPapers, setPrevPapers] = useState(papers)
  if (papers !== prevPapers) {
    setPrevPapers(papers)
    setPage(0)
  }

  const sorted = useMemo(() => {
    if (!sort.key) return papers
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...papers].sort((a, b) => dir * compare(a, b, sort.key as SortKey))
  }, [papers, sort])

  const maxPage = Math.max(0, Math.ceil(sorted.length / PAGE_SIZE) - 1)
  const current = Math.min(page, maxPage)
  const shown = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  function cycle(key: SortKey) {
    setSort((s) =>
      s.key !== key
        ? { key, dir: 'asc' }
        : s.dir === 'asc'
          ? { key, dir: 'desc' }
          : { key: null, dir: 'asc' },
    )
  }

  if (papers.length === 0) {
    return (
      <div className="animate-pt-fade py-16 text-center">
        <p className="font-serif text-[15px] italic text-faint">Không có hồ sơ nào khớp.</p>
        <button
          type="button"
          onClick={openCreatePaper}
          className="mt-2 cursor-pointer font-serif text-[15px] italic text-seal underline decoration-dotted underline-offset-4 hover:no-underline"
        >
          Thêm bài báo mới
        </button>
      </div>
    )
  }

  return (
    <div className="animate-pt-fade">
      {/* Below md the fixed ledger tracks (520px + title) outgrow the page, so the
          sheet scrolls sideways inside this wrapper; from md up it is a no-op. */}
      <div className="sm:max-md:overflow-x-auto">
        <div className="sm:max-md:min-w-[640px]">
          {/* Header row */}
          <div
            className="grid items-end gap-x-3 border-b-[1.5px] border-ink pb-1.5 pl-2 max-sm:hidden"
            style={{ gridTemplateColumns: LEDGER_COLS }}
          >
            {HEADERS.map((h) => (
              <button
                key={h.label}
                type="button"
                disabled={!h.key}
                onClick={() => h.key && cycle(h.key)}
                className={cn(
                  'font-mono text-[9px] uppercase tracking-[1.4px] text-muted max-sm:py-2',
                  h.align === 'right' ? 'text-right' : 'text-left',
                  h.key ? 'cursor-pointer transition-colors hover:text-seal' : 'cursor-default',
                  sort.key === h.key && h.key && 'text-ink',
                )}
              >
                {h.label}
                {sort.key === h.key && h.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
              </button>
            ))}
          </div>

          {/* Rows */}
          {shown.map((p, i) => {
            const aging = agingOf(p)
            const rot = i % 2 === 0 ? 1 : -1.4
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => openPaperDetail(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openPaperDetail(p.id)
                  }
                }}
                className="margin-rule grid animate-pt-fade cursor-pointer items-center gap-x-3 border-b border-rule-2 py-2.5 pl-2 transition-all duration-150 hover:translate-x-1 hover:bg-[rgba(163,56,43,0.05)] max-sm:flex max-sm:flex-col max-sm:gap-2 max-sm:rounded-[4px] max-sm:border max-sm:border-rule-2 max-sm:bg-paper-card max-sm:bg-none max-sm:my-1.5 max-sm:p-3.5 max-sm:shadow-[0_1px_2px_rgba(34,29,20,0.05)]"
                style={{
                  gridTemplateColumns: LEDGER_COLS,
                  animationDelay: `${Math.min(i * 0.03, 0.42)}s`,
                }}
              >
                <div className="contents max-sm:flex max-sm:min-w-0 max-sm:items-baseline max-sm:gap-2">
                  <span className="font-mono text-[11px] text-faint">{p.id}</span>

                  <div className="min-w-0">
                    <div className="truncate font-serif text-[15.5px] font-medium leading-[1.35] text-ink max-sm:overflow-visible max-sm:whitespace-normal">
                      {p.title}
                    </div>
                    <div className="truncate font-serif text-[12.5px] italic text-muted max-sm:overflow-visible max-sm:whitespace-normal">
                      {p.venue}
                      {p.note && (
                        <span className="ml-2 not-italic font-script text-[15px] font-semibold text-seal">
                          ✎ ghi chú
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="contents max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1.5">
                  <div className="truncate font-serif text-[12px] italic text-muted max-sm:overflow-visible max-sm:whitespace-normal">
                    <span className="hidden max-sm:mr-1 max-sm:inline font-mono text-[8px] uppercase tracking-[1px] text-faint">
                      TÁC GIẢ{' '}
                    </span>
                    {authorsShort(p.authors)}
                  </div>

                  <div>
                    <RankChip rank={p.rank} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <StatusStamp status={p.status} rotate={rot} animate={false} />
                      <AdvanceArrow
                        status={p.status}
                        onAdvance={() => advance.mutate(p.id)}
                        size={14}
                      />
                    </div>
                    <ProgressDots status={p.status} />
                  </div>

                  <div className="text-right max-sm:text-left max-sm:justify-self-auto">
                    <div className="font-mono text-[11px] text-muted">{formatDateDots(p.date)}</div>
                    {aging && (
                      <div
                        className="font-script text-[14px] font-semibold leading-[1.2]"
                        style={{ color: aging.long ? 'var(--color-seal)' : 'var(--color-faint)' }}
                      >
                        {aging.label}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <Pager
        total={sorted.length}
        pageSize={PAGE_SIZE}
        page={current}
        onPage={setPage}
        noun="hồ sơ"
      />
    </div>
  )
}
