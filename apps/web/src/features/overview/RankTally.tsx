import { Tally } from '@/components/ui'
import type { TallyRow } from '@papertrack/shared'
import { SectionHead } from './SectionHead'

/** IV. Kiểm đếm theo hạng — hand-drawn tally rows (1 vạch = 1 bài) per rank group. */
export function RankTally({ tally }: { tally: TallyRow[] }) {
  return (
    <div className="mt-[26px]">
      <SectionHead
        numeral="IV"
        numeralLeft={-16}
        ruleDelay={0.6}
        label="IV. Kiểm đếm theo hạng"
        right={<span className="font-serif text-[13px] italic text-muted">1 vạch = 1 bài</span>}
      />
      <div
        className="mt-4 flex animate-pt-fade flex-col gap-[13px]"
        style={{ animationDelay: '0.75s' }}
      >
        {tally.map((t) => (
          <div key={t.label} className="flex items-center gap-3.5">
            <span className="w-[58px] shrink-0 font-mono text-[11px]">{t.label}</span>
            <div className="flex-1">
              <Tally count={t.count} />
            </div>
            <span className="w-6 text-right font-mono text-[11.5px]">{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
