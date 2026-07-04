import { RankChip, statusColor } from '@/components/ui'
import { cn } from '@/lib/utils'
import { type Paper, type Status, formatDateDots, nextStatus } from '@papertrack/shared'
import { agingOf } from './helpers'

/** Ghost `↦` advance affordance — reveals on hover, advances to the next pipeline status. */
export function AdvanceArrow({
  status,
  onAdvance,
  className,
  size = 14,
}: {
  status: Status
  onAdvance: () => void
  className?: string
  /** Glyph size in px — 14 in the ledger, 13 on the kanban card. */
  size?: number
}) {
  const next = nextStatus(status)
  if (!next) return null
  return (
    <button
      type="button"
      title={`Chuyển sang ${next}`}
      aria-label={`Chuyển sang ${next}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onAdvance()
      }}
      style={{ fontSize: size }}
      className={cn(
        'cursor-pointer leading-none text-ink opacity-25 transition-all duration-150 hover:translate-x-0.5 hover:opacity-100',
        className,
      )}
    >
      ↦
    </button>
  )
}

/** Kanban card: colored spine, № + note mark + handwritten aging, title/venue, dashed footer. */
export function PaperCard({
  paper,
  onOpen,
  onAdvance,
  dragging = false,
}: {
  paper: Paper
  onOpen: () => void
  onAdvance: () => void
  dragging?: boolean
}) {
  const color = statusColor(paper.status)
  const aging = agingOf(paper)
  return (
    <div
      onClick={onOpen}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-[2px] border border-transparent bg-paper-card py-2.5 pl-3.5 pr-3',
        'shadow-[0_1px_3px_rgba(34,29,20,0.07)] transition-all duration-150',
        'hover:-translate-y-0.5 hover:border-[#B8AE95] hover:shadow-[0_6px_16px_rgba(34,29,20,0.13)]',
        dragging && 'opacity-40',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: color, opacity: 0.7 }}
      />
      <div className="flex items-start gap-2">
        <span className="font-mono text-[9px] tracking-[0.8px] text-faint">№ {paper.id}</span>
        {paper.note && (
          <span className="font-script text-[14px] font-semibold text-seal" title="có ghi chú">
            ✎
          </span>
        )}
        {aging && (
          <span
            className="ml-auto whitespace-nowrap font-script text-[14.5px] font-semibold leading-none"
            style={{
              transform: 'rotate(-1.5deg)',
              color: aging.long ? 'var(--color-seal)' : 'var(--color-faint)',
            }}
          >
            {aging.label}
          </span>
        )}
      </div>
      <h3 className="mt-1 font-serif text-[13.5px] font-medium leading-[1.45] text-ink">
        {paper.title}
      </h3>
      {paper.venue && (
        <p className="mt-0.5 font-serif text-[11.5px] italic leading-normal text-muted">
          {paper.venue}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 border-t border-dashed border-rule-2 pt-2">
        <RankChip rank={paper.rank} className="!text-[9px]" />
        <span className="font-mono text-[10px] text-faint">{formatDateDots(paper.date)}</span>
        <AdvanceArrow status={paper.status} onAdvance={onAdvance} className="ml-auto" size={13} />
      </div>
    </div>
  )
}
