import { useOverlays } from '@/app/overlays'
import { Pager, ScreenHeader } from '@/components/ui'
import { usePapers } from '@/lib/queries'
import { cn } from '@/lib/utils'
import type { Paper } from '@papertrack/shared'
import { money, paperTotal } from '@papertrack/shared'
import { useState } from 'react'

const PER_PAGE = 12
const GRID = '32px 1fr 130px 130px 130px 150px'

/** A right-aligned money cell — "—" when zero. */
function Cell({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <span
      className={cn(
        'text-right font-mono tabular-nums',
        strong ? 'text-[11.5px] font-semibold text-ink' : 'text-[11px]',
        !strong && (value ? 'text-ink' : 'text-faint'),
      )}
    >
      {value ? money(value) : '—'}
    </span>
  )
}

export function CostsScreen() {
  const { data: papers } = usePapers()
  const { openPaperDetail } = useOverlays()
  const [page, setPage] = useState(0)

  const rows: Paper[] = (papers ?? [])
    .filter((p) => paperTotal(p) > 0)
    .sort((a, b) => paperTotal(b) - paperTotal(a) || a.id - b.id)
  const grand = rows.reduce((s, p) => s + paperTotal(p), 0)
  const view = rows.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)

  return (
    <div className="animate-pt-page mx-auto max-w-[1080px]">
      <ScreenHeader
        watermark="₫"
        eyebrow="Sổ chi phí"
        caption={`${rows.length} hồ sơ có chi phí — tổng ${money(grand)}`}
      />

      {!papers ? (
        <p className="py-24 text-center font-serif text-[14px] italic text-muted">Đang mở sổ…</p>
      ) : rows.length === 0 ? (
        <p className="border border-dashed border-rule-2 px-5 py-10 text-center font-serif text-[13.5px] italic text-muted">
          Chưa có hồ sơ nào phát sinh chi phí.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Header */}
            <div
              className="grid items-baseline gap-3 border-b border-ink pb-2 pl-2 font-mono text-[9px] uppercase tracking-[1.4px] text-muted"
              style={{ gridTemplateColumns: GRID }}
            >
              <span>№</span>
              <span>Bài báo</span>
              <span className="text-right">APC</span>
              <span className="text-right">Hội nghị</span>
              <span className="text-right">Hiệu đính / khác</span>
              <span className="text-right">Tổng</span>
            </div>

            {/* Rows */}
            {view.map((p, i) => (
              <button
                type="button"
                key={p.id}
                onClick={() => openPaperDetail(p.id)}
                className="margin-rule grid w-full cursor-pointer items-baseline gap-3 border-b border-rule py-2.5 pl-2 text-left transition-colors hover:bg-[rgba(163,56,43,0.035)] animate-pt-fade"
                style={{ gridTemplateColumns: GRID, animationDelay: `${0.05 + i * 0.03}s` }}
              >
                <span className="font-mono text-[11px] text-ink-rank">
                  {page * PER_PAGE + i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[14.5px] font-medium text-ink">
                    {p.title}
                  </span>
                  <span className="block truncate font-serif text-[12px] italic text-muted">
                    {p.venue}
                  </span>
                </span>
                <Cell value={p.costs?.apc ?? 0} />
                <Cell value={p.costs?.conf ?? 0} />
                <Cell value={p.costs?.other ?? 0} />
                <Cell value={paperTotal(p)} strong />
              </button>
            ))}

            {/* Grand total */}
            <div
              className="grid items-baseline gap-3 border-t-2 border-ink pt-3 pl-2"
              style={{ gridTemplateColumns: GRID }}
            >
              <span />
              <span className="font-mono text-[10px] uppercase tracking-[1.6px] text-ink">
                Tổng cộng
              </span>
              <span />
              <span />
              <span />
              <span className="text-right font-mono text-[13px] font-semibold leading-none text-ink">
                {money(grand)}
              </span>
            </div>
          </div>

          <Pager
            total={rows.length}
            pageSize={PER_PAGE}
            page={page}
            onPage={setPage}
            noun="khoản chi"
          />
        </div>
      )}
    </div>
  )
}
