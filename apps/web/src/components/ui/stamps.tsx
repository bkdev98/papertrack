import { cn } from '@/lib/utils'
import { PAYMENT_META, STATUS_META, type Status, pipelineIndex } from '@papertrack/shared'

export function statusColor(status: Status): string {
  return STATUS_META[status]?.color ?? '#77705F'
}

// ─── Status stamp ─────────────────────────────────────────────────────────────
export function StatusStamp({
  status,
  short = true,
  rotate = -1.2,
  className,
  animate = true,
}: {
  status: Status
  short?: boolean
  rotate?: number
  className?: string
  animate?: boolean
}) {
  const meta = STATUS_META[status] ?? STATUS_META['Nộp bài']
  return (
    <span
      className={cn(
        'stamp-edge inline-block whitespace-nowrap border-[1.5px] px-[7px] py-[3px] font-mono text-[8.5px] uppercase tracking-[0.8px] opacity-85',
        animate && 'animate-pt-stamp',
        className,
      )}
      style={{ color: meta.color, borderColor: meta.color, transform: `rotate(${rotate}deg)` }}
    >
      {short ? meta.short : meta.label}
    </span>
  )
}

// ─── Rank chip ────────────────────────────────────────────────────────────────
export function RankChip({ rank, className }: { rank: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-[2px] border border-line-chip bg-paper-chip px-1.5 py-px font-mono text-[9.5px] tracking-[0.5px] text-ink-rank',
        className,
      )}
      style={{ transform: 'rotate(-1.2deg)' }}
    >
      {rank || '—'}
    </span>
  )
}

// ─── Progress dots (one per pipeline stage) ────────────────────────────────────
export function ProgressDots({ status, className }: { status: Status; className?: string }) {
  const idx = pipelineIndex(status)
  const color = statusColor(status)
  return (
    <span className={cn('inline-flex items-center gap-[3px]', className)}>
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className="h-[4.5px] w-[4.5px] rounded-full"
          style={{ background: idx >= 0 && i <= idx ? color : 'var(--color-rule-2)' }}
        />
      ))}
    </span>
  )
}

// ─── Payment pill ───────────────────────────────────────────────────────────────
export function PaymentPill({ payment, className }: { payment: string; className?: string }) {
  const meta = PAYMENT_META[payment] ?? { label: '—', color: '#B0A890' }
  return (
    <span
      className={cn(
        'inline-block rounded-[2px] border px-1.5 py-px font-mono text-[10.5px] font-semibold',
        className,
      )}
      style={{ color: meta.color, borderColor: meta.color }}
    >
      {meta.label}
    </span>
  )
}

// ─── Hand-drawn tally (1 stroke = 1 paper) ──────────────────────────────────────
export function Tally({
  count,
  height = 17,
  className,
}: {
  count: number
  /** Stick height: 17px on the overview tally, 15px in the authors table. */
  height?: number
  className?: string
}) {
  const groups = Math.floor(count / 5)
  const rem = count % 5
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      {Array.from({ length: groups }, (_, g) => (
        <span key={g} className="relative inline-flex gap-[3px]">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className="w-[2.5px] bg-ink" style={{ height }} />
          ))}
          <span
            className="pointer-events-none absolute left-[-2px] top-1/2 h-[2px] w-[26px] bg-seal"
            style={{ transform: 'translateY(-50%) rotate(-22deg)' }}
          />
        </span>
      ))}
      {rem > 0 && (
        <span className="inline-flex gap-[3px]">
          {Array.from({ length: rem }, (_, i) => (
            <span key={i} className="w-[2.5px] bg-ink" style={{ height }} />
          ))}
        </span>
      )}
      {count === 0 && <span className="font-serif text-[12px] italic text-faint">—</span>}
    </span>
  )
}
