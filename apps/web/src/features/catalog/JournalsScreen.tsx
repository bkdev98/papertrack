import { Button, Pager, RankChip, ScreenHeader, SearchInput } from '@/components/ui'
import { useJournals, usePapers } from '@/lib/queries'
import type { Journal } from '@papertrack/shared'
import { useState } from 'react'
import { useCatalog } from './catalog-context'
import { hostOf } from './catalog-fields'

const GRID = '32px 1fr 100px 64px 56px 100px 72px'
const PAGE_SIZE = 12
const Q_FILTERS = ['all', 'Q1', 'Q2', 'Q3', 'Q4'] as const

export function JournalsScreen() {
  const { openDetail, openCreate } = useCatalog()
  const journals = useJournals().data ?? []
  const papers = usePapers().data ?? []

  const [q, setQ] = useState('')
  const [qfilter, setQfilter] = useState<(typeof Q_FILTERS)[number]>('all')
  const [page, setPage] = useState(0)

  let rows = journals
  if (qfilter !== 'all') rows = rows.filter((j) => (j.rank ?? '').includes(qfilter))
  if (q.trim()) {
    const needle = q.trim().toLowerCase()
    rows = rows.filter(
      (j) =>
        (j.name ?? '').toLowerCase().includes(needle) ||
        (j.publisher ?? '').toLowerCase().includes(needle),
    )
  }

  const usedCount = (j: Journal) => papers.filter((p) => p.venue === j.name).length
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="animate-pt-page">
      <ScreenHeader watermark="T" eyebrow="Danh mục tạp chí" caption={`${rows.length} tạp chí`}>
        <SearchInput
          value={q}
          placeholder="Tìm tạp chí…"
          className="max-sm:w-[150px]"
          onChange={(e) => {
            setQ(e.target.value)
            setPage(0)
          }}
        />
        <Button variant="ghost-red" size="sm" className="!text-[9.5px]" onClick={openCreate}>
          + Thêm tạp chí
        </Button>
      </ScreenHeader>

      {/* Q filter row */}
      <div
        className="flex animate-pt-up gap-6 border-b border-rule-2 px-0.5 py-2.5"
        style={{ animationDelay: '0.05s' }}
      >
        {Q_FILTERS.map((k) => {
          const active = qfilter === k
          return (
            <button
              type="button"
              key={k}
              onClick={() => {
                setQfilter(k)
                setPage(0)
              }}
              className="cursor-pointer pb-0.5 font-mono text-[9.5px] uppercase tracking-[1.2px] transition-colors max-sm:py-2"
              style={{
                color: active ? 'var(--color-ink)' : 'var(--color-muted-2)',
                borderBottom: `2px solid ${active ? 'var(--color-seal)' : 'transparent'}`,
              }}
            >
              {k === 'all' ? 'Tất cả' : k}
            </button>
          )
        })}
      </div>

      {/* Header + rows share one scroller so the ledger columns stay aligned on narrow screens */}
      <div className="no-scrollbar sm:max-lg:overflow-x-auto">
        <div className="sm:max-lg:min-w-[640px]">
          {/* Header */}
          <div
            className="grid animate-pt-up gap-[14px] border-b border-rule-2 px-1.5 pb-2 pt-2.5 font-mono text-[9px] uppercase tracking-[1.4px] text-faint max-sm:hidden"
            style={{ gridTemplateColumns: GRID, animationDelay: '0.1s' }}
          >
            <span>№</span>
            <span>Tạp chí — nhà xuất bản</span>
            <span>ISSN</span>
            <span>Hạng</span>
            <span className="text-right">IF</span>
            <span>Quốc gia</span>
            <span className="text-right">Đã gửi</span>
          </div>

          {/* Rows */}
          <div
            className="margin-rule flex animate-pt-up flex-col max-sm:bg-none"
            style={{ animationDelay: '0.15s' }}
          >
            {pageRows.map((j, i) => (
              <button
                type="button"
                key={j.id}
                onClick={() => openDetail(j.id)}
                className="grid items-baseline gap-[14px] border-b border-rule-2 px-1.5 py-3 text-left transition-colors hover:bg-[rgba(163,56,43,0.05)] max-sm:flex max-sm:flex-col max-sm:gap-2 max-sm:rounded-[4px] max-sm:border max-sm:border-rule-2 max-sm:bg-paper-card max-sm:my-1.5 max-sm:p-3.5 max-sm:shadow-[0_1px_2px_rgba(34,29,20,0.05)]"
                style={{ gridTemplateColumns: GRID }}
              >
                <div className="contents max-sm:flex max-sm:min-w-0 max-sm:items-baseline max-sm:gap-2">
                  <span className="font-mono text-[11px] text-faint">
                    {String(page * PAGE_SIZE + i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className="font-serif text-[15px] font-medium text-ink">{j.name}</span>
                    <span className="font-serif text-[12.5px] italic text-muted">
                      {' '}
                      — {j.publisher || hostOf(j.web) || '—'}
                    </span>
                  </span>
                </div>
                <div className="contents max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1.5">
                  <span className="truncate font-mono text-[10px] text-muted max-sm:overflow-visible max-sm:whitespace-normal">
                    <span className="hidden max-sm:mr-1 max-sm:inline font-mono text-[8px] uppercase tracking-[1px] text-faint">
                      ISSN{' '}
                    </span>
                    {j.issn || j.fee || '—'}
                  </span>
                  <RankChip rank={j.rank} className="justify-self-start max-sm:justify-self-auto" />
                  <span className="text-right font-mono text-[11px] text-ink max-sm:text-left max-sm:justify-self-auto">
                    <span className="hidden max-sm:mr-1 max-sm:inline font-mono text-[8px] uppercase tracking-[1px] text-faint">
                      IF{' '}
                    </span>
                    {j.impact ? j.impact.replace('.', ',') : '—'}
                  </span>
                  <span className="truncate font-serif text-[13px] italic text-muted max-sm:overflow-visible max-sm:whitespace-normal">
                    <span className="hidden max-sm:mr-1 max-sm:inline font-mono text-[8px] uppercase tracking-[1px] text-faint">
                      QG{' '}
                    </span>
                    {j.country || '—'}
                  </span>
                  <span className="justify-self-end font-mono text-[11px] text-ink max-sm:justify-self-auto">
                    <span className="hidden max-sm:mr-1 max-sm:inline font-mono text-[8px] uppercase tracking-[1px] text-faint">
                      ĐÃ GỬI{' '}
                    </span>
                    {usedCount(j)}
                  </span>
                </div>
              </button>
            ))}
            {!pageRows.length && (
              <div className="px-1.5 py-8 font-serif text-[13px] italic text-faint">
                {journals.length
                  ? 'Không tìm thấy tạp chí phù hợp.'
                  : 'Chưa có tạp chí nào trong danh mục.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <Pager total={rows.length} pageSize={PAGE_SIZE} page={page} onPage={setPage} noun="tạp chí" />
    </div>
  )
}
