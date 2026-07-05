import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

// ─── Giant faint watermark letter behind a screen header ────────────────────────
export function Watermark({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute select-none font-display italic', className)}
      style={{ left: -10, top: -38, fontSize: 92, color: 'rgba(34,29,20,0.07)', lineHeight: 1 }}
    >
      {children}
    </span>
  )
}

// ─── The 1.5px ink section underline that draws in ──────────────────────────────
export function SectionRule({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={cn('h-[1.5px] origin-left bg-ink animate-pt-draw', className)}
      style={{ animationDelay: `${delay}s` }}
    />
  )
}

// ─── Screen header: watermark + eyebrow + caption + right controls + rule ───────
export function ScreenHeader({
  watermark,
  eyebrow,
  caption,
  children,
  rule = true,
}: {
  watermark: string
  eyebrow: string
  caption?: ReactNode
  children?: ReactNode
  /** Draw the section rule under the header. Off when the next element already
   *  supplies its own divider (e.g. the status filter strip) to avoid doubling. */
  rule?: boolean
}) {
  return (
    <header className={cn('relative', rule ? 'mb-5' : 'mb-0')}>
      <Watermark>{watermark}</Watermark>
      <div className="relative flex flex-wrap items-baseline gap-x-4 gap-y-2 pb-2">
        <h1 className="font-mono text-[10.5px] uppercase tracking-[1.8px] text-ink">{eyebrow}</h1>
        {caption && <span className="font-serif text-[13px] italic text-muted">{caption}</span>}
        {children && (
          <div className="ml-auto flex items-center gap-4 max-sm:flex-wrap max-sm:justify-end">
            {children}
          </div>
        )}
      </div>
      {rule && <SectionRule delay={0.15} />}
    </header>
  )
}

// ─── A titled sub-section with a mono eyebrow + rule and optional right link ─────
export function Section({
  eyebrow,
  right,
  children,
  className,
  delay = 0.3,
  compact = false,
}: {
  eyebrow: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
  delay?: number
  /** Tighter eyebrow (9px/1.6px) for dense screens; default is 10.5px/1.8px. */
  compact?: boolean
}) {
  return (
    <section className={className}>
      <div className="flex items-baseline justify-between pb-1.5">
        <h2
          className={cn(
            'font-mono uppercase text-muted',
            compact ? 'text-[9px] tracking-[1.6px]' : 'text-[10.5px] tracking-[1.8px]',
          )}
        >
          {eyebrow}
        </h2>
        {right && <div className="font-serif text-[12.5px] italic text-muted">{right}</div>}
      </div>
      <SectionRule className="!bg-ink/80" delay={delay} />
      <div className="pt-4">{children}</div>
    </section>
  )
}

// ─── Wax seal (ĐÃ KIỂM KÊ) ───────────────────────────────────────────────────────
export function WaxSeal({
  top = 'IUH · CNTT',
  label = 'ĐÃ KIỂM KÊ',
  date,
  size = 126,
  className,
}: {
  top?: string
  label?: string
  date: string
  size?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-seal animate-pt-stamp',
        className,
      )}
      style={{
        width: size,
        height: size,
        border: '2.5px solid var(--color-seal)',
        mixBlendMode: 'multiply',
        animationDelay: '0.8s',
      }}
    >
      <div
        className="flex flex-col items-center justify-center gap-1 rounded-full text-center"
        style={{ width: size - 20, height: size - 20, border: '1px dashed var(--color-seal)' }}
      >
        <span className="font-mono text-[8.5px] tracking-[2.5px]">{top}</span>
        <span className="border-y border-seal/60 px-1 py-0.5 font-mono text-[12px] font-semibold tracking-[1.5px]">
          {label}
        </span>
        <span className="font-mono text-[9px] tracking-[1.5px]">{date}</span>
      </div>
    </div>
  )
}

// ─── Taped sticky note ──────────────────────────────────────────────────────────
export function StickyNote({
  children,
  rotate = 1.4,
  className,
}: {
  children: ReactNode
  rotate?: number
  className?: string
}) {
  return (
    <div
      className={cn('relative bg-paper-note px-5 py-4 animate-pt-fade', className)}
      style={{
        transform: `rotate(${rotate}deg)`,
        boxShadow: '0 3px 12px rgba(34,29,20,0.14)',
        animationDelay: '1.1s',
      }}
    >
      <span
        aria-hidden
        className="washi-tape absolute left-1/2 top-[-9px] h-[18px] w-16 -translate-x-1/2"
        style={{ transform: 'translateX(-50%) rotate(2deg)' }}
      />
      {children}
    </div>
  )
}

// ─── Stat cell (overview / filter counts) ───────────────────────────────────────
export function StatCell({
  eyebrow,
  value,
  sub,
  onClick,
  className,
  delay = 0,
}: {
  eyebrow: ReactNode
  value: ReactNode
  sub?: ReactNode
  onClick?: () => void
  className?: string
  delay?: number
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'group block border-b border-rule pb-3 text-left animate-pt-up',
        onClick && 'cursor-pointer transition-colors',
        className,
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="font-mono text-[9.5px] uppercase tracking-[1.6px] text-muted transition-colors group-hover:text-seal">
        {eyebrow}
      </div>
      <div className="mt-1 font-display leading-none text-ink transition-colors group-hover:text-seal">
        {value}
      </div>
      {sub && <div className="mt-1 font-serif text-[12.5px] italic text-muted">{sub}</div>}
    </Comp>
  )
}
