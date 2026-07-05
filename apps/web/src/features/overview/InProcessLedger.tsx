import { PATHS } from '@/app/nav'
import { useOverlays } from '@/app/overlays'
import { RankChip, StatusStamp } from '@/components/ui'
import { type Paper, formatDateDots, statusGroup } from '@papertrack/shared'
import { useNavigate } from 'react-router-dom'
import { SectionHead } from './SectionHead'

const pad2 = (n: number) => String(n).padStart(2, '0')

/** II. Sổ theo dõi — đang xử lý — ledger of the first five in-process papers on
 *  the red margin rule; a row opens the global paper detail drawer. */
export function InProcessLedger({ papers, inprocCount }: { papers: Paper[]; inprocCount: number }) {
  const nav = useNavigate()
  const { openPaperDetail } = useOverlays()
  const rows = papers.filter((p) => statusGroup(p.status) === 'inprocess').slice(0, 5)

  return (
    <div className="mt-9">
      <SectionHead
        numeral="II"
        numeralLeft={-14}
        ruleDelay={0.5}
        label="II. Sổ theo dõi — đang xử lý"
        right={
          <button
            type="button"
            onClick={() => nav(PATHS.papers('dang-xu-ly'))}
            className="cursor-pointer border-b border-seal font-serif text-[13px] italic text-seal transition-colors hover:border-ink hover:text-ink max-sm:border-b-0 max-sm:py-3.5 max-sm:underline max-sm:decoration-seal max-sm:underline-offset-2"
          >
            Xem tất cả {inprocCount} bài →
          </button>
        }
      />
      <div className="sm:overflow-x-auto">
        <div
          className="margin-rule flex sm:min-w-[520px] animate-pt-fade flex-col max-sm:bg-none"
          style={{ animationDelay: '0.6s' }}
        >
          {rows.map((p, i) => (
            <button
              type="button"
              key={p.id}
              onClick={() => openPaperDetail(p.id)}
              className="grid items-baseline gap-3.5 border-b border-rule-2 px-1.5 py-3 text-left transition-all hover:translate-x-1 hover:bg-seal/5 max-sm:flex max-sm:flex-col max-sm:gap-2 max-sm:rounded-[4px] max-sm:border max-sm:border-rule-2 max-sm:bg-paper-card max-sm:my-1.5 max-sm:p-3.5 max-sm:shadow-[0_1px_2px_rgba(34,29,20,0.05)]"
              style={{ gridTemplateColumns: '32px 1fr 140px 74px 96px' }}
            >
              <div className="contents max-sm:flex max-sm:min-w-0 max-sm:items-baseline max-sm:gap-2">
                <span className="font-mono text-[11px] text-faint">{pad2(i + 1)}</span>
                <div className="min-w-0">
                  <div className="text-[15px] font-medium leading-[1.35]">{p.title}</div>
                  <div className="mt-px font-serif text-[12.5px] italic text-muted">
                    {p.venue}
                    {p.note && (
                      <span className="ml-1 font-script text-[15px] font-semibold text-seal">
                        ✎
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="contents max-sm:flex max-sm:flex-wrap max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1.5">
                <StatusStamp
                  status={p.status}
                  rotate={i % 2 ? 1 : -1.4}
                  animate={false}
                  className="justify-self-start max-sm:justify-self-auto"
                />
                <RankChip rank={p.rank} className="justify-self-start max-sm:justify-self-auto" />
                <span className="justify-self-end font-mono text-[11px] text-muted max-sm:justify-self-auto">
                  {formatDateDots(p.date)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
