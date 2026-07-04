import { SectionRule } from '@/components/ui'
import type { ReactNode } from 'react'

/**
 * The dashboard sub-section header: a giant faint roman-numeral watermark, a
 * mono uppercase label, an optional right control, and the ink rule that draws in.
 */
export function SectionHead({
  numeral,
  numeralLeft = -10,
  label,
  right,
  ruleDelay = 0.3,
}: {
  numeral: string
  numeralLeft?: number
  label: string
  right?: ReactNode
  ruleDelay?: number
}) {
  return (
    <>
      <div className="relative flex items-baseline justify-between pb-2">
        <span
          aria-hidden
          className="pointer-events-none absolute select-none font-display font-normal italic"
          style={{
            left: numeralLeft,
            top: -38,
            fontSize: 92,
            color: 'rgba(34,29,20,0.07)',
            lineHeight: 1,
          }}
        >
          {numeral}
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[1.8px] text-ink">{label}</span>
        {right}
      </div>
      <SectionRule delay={ruleDelay} />
    </>
  )
}
