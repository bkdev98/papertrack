import { cn } from '@/lib/utils'

/**
 * A hand-drawn ink ellipse that strokes itself on around a numeral, like a pen
 * circling a figure in a ledger. Absolutely positioned so it overlays without
 * shifting layout; `preserveAspectRatio="none"` + a non-scaling stroke let it
 * stretch to whatever it wraps while keeping a constant line weight.
 */
export function InkRing({ className }: { className?: string }) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative overlay; the parent control conveys selection via aria-pressed
    <svg
      aria-hidden
      viewBox="0 0 100 60"
      preserveAspectRatio="none"
      className={cn('ink-ring pointer-events-none absolute', className)}
      style={{ top: -6, right: -8, bottom: -7, left: -8 }}
    >
      <path
        d="M74 15C52 6 24 8 15 25C8 38 18 53 47 54C75 55 91 43 86 25C82 14 63 9 46 13"
        pathLength={100}
        fill="none"
        stroke="var(--color-seal)"
        strokeWidth={1.75}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
