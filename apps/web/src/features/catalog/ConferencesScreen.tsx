import { Button, ScreenHeader } from '@/components/ui'
import { useConferences, usePapers } from '@/lib/queries'
import type { Conference } from '@papertrack/shared'
import { daysUntil, formatDateDots, money } from '@papertrack/shared'
import { useCatalog } from './catalog-context'
import { Timeline, TimelineCircle } from './catalog-timeline'

/** Past deadlines sink to the bottom; upcoming sorted soonest-first. */
function byDeadline(a: Conference, b: Conference) {
  const da = daysUntil(a.deadline)
  const db = daysUntil(b.deadline)
  const pa = da == null || da < 0
  const pb = db == null || db < 0
  if (pa !== pb) return pa ? 1 : -1
  return (da ?? 9999) - (db ?? 9999)
}

export function ConferencesScreen() {
  const { openDetail, openCreate } = useCatalog()
  const conferences = useConferences().data ?? []
  const papers = usePapers().data ?? []

  const rows = conferences.slice().sort(byDeadline)

  return (
    <div className="animate-pt-page">
      <ScreenHeader
        watermark="H"
        eyebrow="Lịch hội thảo"
        caption={`${conferences.length} hội thảo · sắp theo hạn nộp`}
      >
        <Button variant="ghost-red" size="sm" className="!text-[9.5px]" onClick={openCreate}>
          + Thêm hội thảo
        </Button>
      </ScreenHeader>

      <Timeline>
        {rows.map((c, i) => {
          const d = daysUntil(c.deadline)
          const past = d == null || d < 0
          const urgent = !past && (d as number) <= 15
          const linkedN = papers.filter((p) => p.venue && c.name.includes(p.venue)).length
          const fee = c.fee ? `phí ${money(c.fee)}` : c.feeText ? `phí ${c.feeText}` : ''
          const sub = `${c.location || '—'} · ${c.rank || ''}${c.confdate ? ` · diễn ra ${formatDateDots(c.confdate)}` : ''}`
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => openDetail(c.id)}
              className="flex w-full animate-pt-up items-start gap-[18px] border-b border-rule-3 py-4 text-left transition-colors hover:bg-[rgba(163,56,43,0.04)]"
              style={{ opacity: past ? 0.55 : 1, animationDelay: `${0.15 + i * 0.04}s` }}
            >
              <TimelineCircle days={d ?? -1} index={i} />
              <div className="flex-1 pt-1">
                <div className="font-serif text-[16px] font-medium leading-[1.35] text-ink">
                  {c.name}
                </div>
                <div className="mt-[3px] font-serif text-[13px] italic text-muted">{sub}</div>
              </div>
              <div className="shrink-0 pt-[5px] text-right">
                <div
                  className="font-mono text-[10px] tracking-[0.8px]"
                  style={{ color: urgent ? 'var(--color-seal)' : 'var(--color-muted)' }}
                >
                  HẠN {formatDateDots(c.deadline)}
                </div>
                {fee && <div className="mt-[3px] font-mono text-[10px] text-faint">{fee}</div>}
                {linkedN > 0 && (
                  <div className="mt-[3px] font-script text-[15.5px] font-semibold text-seal">
                    {linkedN} bài đã gửi ↗
                  </div>
                )}
              </div>
            </button>
          )
        })}
        {!rows.length && (
          <div className="py-10 pl-[78px] font-serif text-[13px] italic text-faint">
            Chưa có hội thảo nào trong lịch — nhấn + Thêm hội thảo để theo dõi hạn nộp.
          </div>
        )}
      </Timeline>
    </div>
  )
}
