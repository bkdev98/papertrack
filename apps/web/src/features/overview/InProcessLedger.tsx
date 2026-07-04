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
            className="cursor-pointer border-b border-seal font-serif text-[13px] italic text-seal transition-colors hover:border-ink hover:text-ink"
          >
            Xem tất cả {inprocCount} bài →
          </button>
        }
      />
      <div className="margin-rule flex animate-pt-fade flex-col" style={{ animationDelay: '0.6s' }}>
        {rows.map((p, i) => (
          <button
            type="button"
            key={p.id}
            onClick={() => openPaperDetail(p.id)}
            className="grid items-baseline gap-3.5 border-b border-rule-2 px-1.5 py-3 text-left transition-all hover:translate-x-1 hover:bg-seal/5"
            style={{ gridTemplateColumns: '32px 1fr 140px 74px 96px' }}
          >
            <span className="font-mono text-[11px] text-faint">{pad2(i + 1)}</span>
            <div className="min-w-0">
              <div className="text-[15px] font-medium leading-[1.35]">{p.title}</div>
              <div className="mt-px font-serif text-[12.5px] italic text-muted">
                {p.venue}
                {p.note && (
                  <span className="ml-1 font-script text-[15px] font-semibold text-seal">✎</span>
                )}
              </div>
            </div>
            <StatusStamp
              status={p.status}
              rotate={i % 2 ? 1 : -1.4}
              animate={false}
              className="justify-self-start"
            />
            <RankChip rank={p.rank} className="justify-self-start" />
            <span className="justify-self-end font-mono text-[11px] text-muted">
              {formatDateDots(p.date)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
