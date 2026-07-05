import { PATHS } from '@/app/nav'
import { CountdownCircle } from '@/components/ui'
import { type Deadline, formatDateDots } from '@papertrack/shared'
import { useNavigate } from 'react-router-dom'
import { SectionHead } from './SectionHead'

const ROTS = ['-5deg', '3deg', '-2deg', '4deg', '-3deg', '2deg', '-4deg']

/** III. Hạn nộp sắp tới — dashed spine with up to four upcoming deadlines, each a
 *  56px countdown circle + a red "gấp!" when urgent. */
export function DeadlineTimeline({ deadlines }: { deadlines: Deadline[] }) {
  const nav = useNavigate()
  const rows = deadlines.filter((d) => d.days >= 0).slice(0, 4)

  return (
    <div>
      <SectionHead
        numeral="III"
        numeralLeft={-16}
        ruleDelay={0.4}
        label="III. Hạn nộp sắp tới"
        right={
          <button
            type="button"
            onClick={() => nav(PATHS.catalog('hoi-thao'))}
            className="cursor-pointer font-serif text-[13px] italic text-muted transition-colors hover:text-seal max-sm:py-3.5"
          >
            Xem hội thảo →
          </button>
        }
      />
      <div className="relative mt-1 animate-pt-fade" style={{ animationDelay: '0.55s' }}>
        <div
          aria-hidden
          className="absolute bottom-4 left-7 top-4 w-[1.5px] opacity-55"
          style={{
            background:
              'repeating-linear-gradient(180deg,var(--color-seal) 0 7px,transparent 7px 12px)',
          }}
        />
        {rows.map((d, i) => (
          <div key={`${d.kind}-${d.id}`} className="flex items-start gap-4 py-[13px]">
            <CountdownCircle
              days={d.days}
              size={56}
              rotate={ROTS[i % ROTS.length]}
              className="relative z-10 shrink-0"
            />
            <div className="flex-1 pt-[3px]">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[14.5px] font-medium leading-[1.35]">{d.name}</span>
                {d.urgent && (
                  <span
                    className="font-script text-[18px] font-semibold text-seal"
                    style={{ transform: 'rotate(-4deg)' }}
                  >
                    gấp!
                  </span>
                )}
              </div>
              <div className="mt-0.5 font-serif text-[12.5px] italic text-muted">
                {d.sub} · hạn {formatDateDots(d.deadline)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
