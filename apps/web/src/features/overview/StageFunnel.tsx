import { STATUS_META, type StageStat } from '@papertrack/shared'
import { SectionHead } from './SectionHead'

// Bar colors for the five in-process stages (design §4.1), distinct from the
// status-meta palette used elsewhere.
const BAR_COLORS = ['#221D14', '#221D14', '#A3382B', '#A3382B', '#8A7A4A']

/** I. Tiến trình xử lý — five stage columns with display-serif counts and
 *  ptDraw bars sized against the busiest stage. */
export function StageFunnel({ stages, inprocCount }: { stages: StageStat[]; inprocCount: number }) {
  const max = stages.reduce((m, s) => Math.max(m, s.count), 0)
  return (
    <div>
      <SectionHead
        numeral="I"
        numeralLeft={-10}
        ruleDelay={0.3}
        label="I. Tiến trình xử lý"
        right={
          <span className="font-serif text-[13px] italic text-muted">
            {inprocCount} bài trong quy trình
          </span>
        }
      />
      <div className="mt-[18px] grid grid-cols-[repeat(5,1fr)] max-sm:grid-cols-3 max-sm:gap-y-4">
        {stages.map((s, i) => {
          const width = max ? Math.max((s.count / max) * 100, 8) : 8
          return (
            <div
              key={s.status}
              className="animate-pt-up pr-4"
              style={{ animationDelay: `${0.15 + i * 0.05}s` }}
            >
              <div className="font-display text-[38px] leading-none text-ink">{s.count}</div>
              <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[1.2px] text-muted">
                {STATUS_META[s.status].short}
              </div>
              <div
                className="mt-2.5 h-[3px] origin-left animate-pt-draw"
                style={{
                  width: `${width}%`,
                  background: BAR_COLORS[i] ?? '#221D14',
                  animationDelay: `${0.45 + i * 0.05}s`,
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
