import { CountdownCircle } from '@/components/ui'
import { HAND_ROTATIONS } from '@/lib/utils'
import type { ReactNode } from 'react'

/** Dashed red timeline spine shared by the conferences & special-issue lists. */
export function Timeline({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative mt-1.5 max-w-[860px] animate-pt-up"
      style={{ animationDelay: '0.12s' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-5 left-[30px] top-5 w-[1.5px]"
        style={{
          background:
            'repeating-linear-gradient(180deg,var(--color-seal) 0 7px,transparent 7px 12px)',
          opacity: 0.55,
        }}
      />
      {children}
    </div>
  )
}

/** 60px day-count disc that sits over the spine, hand-rotated per row. */
export function TimelineCircle({ days, index }: { days: number; index: number }) {
  const rot = HAND_ROTATIONS[index % HAND_ROTATIONS.length] ?? '0deg'
  return (
    <span className="relative z-[1] shrink-0" style={{ transform: `rotate(${rot})` }}>
      <CountdownCircle days={days} size={60} />
    </span>
  )
}
