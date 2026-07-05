import { Button, ScreenHeader } from '@/components/ui'
import { useSpecialIssues } from '@/lib/queries'
import { daysUntil, formatDateDots } from '@papertrack/shared'
import { useCatalog } from './catalog-context'
import { Timeline, TimelineCircle } from './catalog-timeline'

export function SpecialIssuesScreen() {
  const { openDetail, openCreate } = useCatalog()
  const specialIssues = useSpecialIssues().data ?? []

  const rows = specialIssues
    .slice()
    .sort((a, b) => (daysUntil(a.deadline) ?? 9999) - (daysUntil(b.deadline) ?? 9999))
  const open = rows.filter((si) => {
    const d = daysUntil(si.deadline)
    return d != null && d >= 0
  }).length

  return (
    <div className="animate-pt-page">
      <ScreenHeader
        watermark="S"
        eyebrow="Special Issue / Chương sách"
        caption={`${open} lời mời đang mở`}
      >
        <Button variant="ghost-red" size="sm" className="!text-[9.5px]" onClick={openCreate}>
          + Thêm mục
        </Button>
      </ScreenHeader>

      <Timeline>
        {rows.map((si, i) => {
          const d = daysUntil(si.deadline)
          const urgent = d != null && d >= 0 && d <= 15
          return (
            <button
              type="button"
              key={si.id}
              onClick={() => openDetail(si.id)}
              className="flex w-full animate-pt-up items-start gap-[18px] border-b border-rule-3 py-4 text-left transition-colors hover:bg-[rgba(163,56,43,0.04)] max-sm:flex-wrap"
              style={{ animationDelay: `${0.15 + i * 0.04}s` }}
            >
              <TimelineCircle days={d ?? -1} index={i} />
              <div className="flex-1 pt-1">
                <div className="flex items-baseline gap-2.5 max-sm:flex-wrap">
                  <span className="font-serif text-[16px] font-medium leading-[1.35] text-ink">
                    {si.name}
                  </span>
                  <span className="max-sm:whitespace-nowrap border border-line px-1.5 py-px font-mono text-[9px] uppercase tracking-[0.8px] text-muted">
                    {si.type || 'Special Issue'}
                  </span>
                </div>
                <div className="mt-[3px] font-serif text-[13px] italic text-muted">
                  {si.journal || '—'} · {si.rank || '—'}
                </div>
              </div>
              <div className="shrink-0 pt-[5px] text-right max-sm:w-full max-sm:pl-[78px] max-sm:pt-0 max-sm:text-left">
                <div
                  className="font-mono text-[10px] tracking-[0.8px]"
                  style={{ color: urgent ? 'var(--color-seal)' : 'var(--color-muted)' }}
                >
                  HẠN {formatDateDots(si.deadline)}
                </div>
              </div>
            </button>
          )
        })}
        {!rows.length && (
          <div className="py-10 pl-[78px] font-serif text-[13px] italic text-faint">
            Chưa có Special Issue hay chương sách nào — nhấn + Thêm mục để mở lời mời đầu tiên.
          </div>
        )}
      </Timeline>
    </div>
  )
}
