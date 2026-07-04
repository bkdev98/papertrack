import { cn } from '@/lib/utils'

/** Rotated day-count disc used on deadlines/conferences. */
export function CountdownCircle({
  days,
  size = 56,
  rotate = 0,
  className,
}: {
  days: number
  size?: number
  rotate?: number | string
  className?: string
}) {
  const rot = typeof rotate === 'number' ? `${rotate}deg` : rotate
  const past = days < 0
  const urgent = days >= 0 && days <= 15
  const warn = days > 15 && days <= 30

  const big = past ? '✓' : String(days)
  const small = past ? 'ĐÃ QUA' : 'NGÀY'

  let fg = 'var(--color-ink)'
  let bg = 'var(--color-paper)'
  let border = 'var(--color-line-chip)'
  if (urgent) {
    bg = 'var(--color-seal)'
    fg = 'var(--color-paper)'
    border = 'var(--color-seal)'
  } else if (warn) {
    fg = 'var(--color-seal)'
    border = 'var(--color-seal)'
  } else if (past) {
    fg = 'var(--color-faint)'
    border = 'var(--color-line)'
  }

  return (
    <span
      className={cn('inline-flex flex-col items-center justify-center rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        border: `1.5px solid ${border}`,
        transform: `rotate(${rot})`,
        opacity: past ? 0.6 : 1,
      }}
    >
      <span className="font-display font-semibold leading-none" style={{ fontSize: 20 }}>
        {big}
      </span>
      <span className="font-mono tracking-[1px]" style={{ fontSize: 7.5 }}>
        {small}
      </span>
    </span>
  )
}
