import { PATHS } from '@/app/nav'
import { StatCell, WaxSeal } from '@/components/ui'
import { useOverview, usePapers } from '@/lib/queries'
import { formatDateDots, moneySplit } from '@papertrack/shared'
import { useNavigate } from 'react-router-dom'
import { DashboardNote } from './DashboardNote'
import { DeadlineTimeline } from './DeadlineTimeline'
import { InProcessLedger } from './InProcessLedger'
import { RankTally } from './RankTally'
import { Sparkline } from './Sparkline'
import { StageFunnel } from './StageFunnel'

/** §4.1 Tổng quan — the archival-ledger dashboard. */
export function OverviewScreen() {
  const nav = useNavigate()
  const { data: over } = useOverview()
  const { data: papers } = usePapers()

  if (!over) return <div className="animate-pt-page" />

  const { stats, deadlines } = over
  const todayDots = formatDateDots(new Date())

  const reward = moneySplit(stats.rewardEst)
  const spent = moneySplit(stats.spent)
  const unpaid = moneySplit(stats.unpaid.amount)

  const roiNote = stats.roiX >= 2 ? `≈ ${Math.round(stats.roiX)}× chi phí!` : ''
  const deltaNote =
    stats.yearDelta === 0
      ? ''
      : `${stats.yearDelta > 0 ? '↑ +' : '↓ −'}${Math.abs(stats.yearDelta)} bài!`
  const deltaColor = stats.yearDelta >= 0 ? 'var(--color-positive)' : 'var(--color-seal)'
  const unpaidMark = stats.unpaid.count ? 'nhắc nhóm!' : '✓ sạch sổ'
  const unpaidSub = stats.unpaid.count
    ? `${stats.unpaid.count} khoản đang chờ xử lý`
    : 'không có khoản nào chờ'

  const num = 'whitespace-nowrap text-[46px]'
  const unit = 'font-serif text-[20px] font-normal italic'

  return (
    <div className="animate-pt-page font-serif text-ink">
      {/* ── Top grid: hero + sparkline · six stat cells · seal + note ── */}
      <div
        className="grid items-start gap-7"
        style={{ gridTemplateColumns: 'minmax(200px,260px) minmax(355px,1fr) minmax(165px,215px)' }}
      >
        {/* LEFT — hero + sparkline */}
        <div className="min-w-0 animate-pt-ink" style={{ animationDelay: '0.1s' }}>
          <button
            type="button"
            onClick={() => nav(PATHS.papers('tat-ca'))}
            className="block cursor-pointer text-left text-ink transition-colors hover:text-seal"
          >
            <div className="font-mono text-[10px] uppercase tracking-[1.8px] text-muted">
              Tổng bài báo
            </div>
            <div
              className="mt-3 font-display tabular-nums"
              style={{ fontSize: 148, lineHeight: 0.85, letterSpacing: '-3px' }}
            >
              {stats.total}
            </div>
            <div className="mt-3.5 font-serif text-[14px] italic text-muted">
              {stats.journalCount} tạp chí · {stats.confCount} hội thảo ·{' '}
              <span className="text-seal">{stats.rejectedCount} từ chối</span>
            </div>
          </button>
          <Sparkline spark={stats.spark} />
        </div>

        {/* CENTER — six stat cells */}
        <div
          className="grid gap-x-6 gap-y-5"
          style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(163px,1fr))' }}
        >
          <StatCell
            className="min-w-0"
            delay={0.2}
            onClick={() => nav(PATHS.papers('hoan-thanh'))}
            eyebrow="Đã công bố"
            value={<span className={num}>{stats.published}</span>}
            sub={`${stats.pubPct}% tỷ lệ thành công`}
          />
          <StatCell
            className="min-w-0"
            delay={0.28}
            onClick={() => nav(PATHS.papers('tat-ca'))}
            eyebrow="Hạng Q1/Q2"
            value={
              <span className="inline-flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="relative whitespace-nowrap text-[46px]">
                  {stats.q12}
                  <span
                    aria-hidden
                    className="wobble-ring absolute animate-pt-fade"
                    style={{
                      inset: '-7px -13px -5px -11px',
                      transform: 'rotate(-4deg)',
                      animationDelay: '1.3s',
                    }}
                  />
                </span>
                <span
                  className="animate-pt-fade font-script text-[16px] font-semibold text-seal"
                  style={{ transform: 'rotate(-5deg)', animationDelay: '1.5s' }}
                >
                  {'kỷ lục!'}
                </span>
              </span>
            }
            sub={`${stats.q1} bài Q1 · ${stats.q2} bài Q2`}
          />
          <StatCell
            className="min-w-0"
            delay={0.36}
            onClick={() => nav(PATHS.papers('tat-ca'))}
            eyebrow={`Nộp năm ${stats.yearNow.year}`}
            value={
              <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={num}>{stats.yearNow.count}</span>
                {deltaNote && (
                  <span
                    className="font-script text-[16px] font-semibold"
                    style={{ color: deltaColor, transform: 'rotate(-3deg)' }}
                  >
                    {deltaNote}
                  </span>
                )}
              </span>
            }
            sub={`năm ${stats.yearPrev.year}: ${stats.yearPrev.count} bài`}
          />
          <StatCell
            className="min-w-0"
            delay={0.44}
            onClick={() => nav(PATHS.finance('khen-thuong'))}
            eyebrow="Khen thưởng dự kiến"
            value={
              <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={num}>
                  {reward.v}
                  <span className={unit}> {reward.u}</span>
                </span>
                {roiNote && (
                  <span
                    className="font-script text-[15.5px] font-semibold text-seal"
                    style={{ transform: 'rotate(-2deg)' }}
                  >
                    {roiNote}
                  </span>
                )}
              </span>
            }
            sub="theo Quy chế 2026"
          />
          <StatCell
            className="min-w-0"
            delay={0.52}
            onClick={() => nav(PATHS.finance('so-chi-phi'))}
            eyebrow="Chi phí đã chi"
            value={
              <span className={num}>
                {spent.v}
                <span className={unit}> {spent.u}</span>
              </span>
            }
            sub="APC · hội nghị · hiệu đính"
          />
          <StatCell
            className="min-w-0"
            delay={0.6}
            onClick={() => nav(PATHS.finance('so-chi-phi'))}
            eyebrow="Phí chờ thanh toán"
            value={
              <span className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className={num}>
                  {unpaid.v}
                  <span className={unit}> {unpaid.u}</span>
                </span>
                <span
                  className="font-script text-[15.5px] font-semibold text-seal"
                  style={{ transform: 'rotate(-2.5deg)' }}
                >
                  {unpaidMark}
                </span>
              </span>
            }
            sub={unpaidSub}
          />
        </div>

        {/* RIGHT — wax seal + taped sticky note */}
        <div className="flex flex-col items-center gap-6 pt-0.5">
          <WaxSeal date={todayDots} />
          <DashboardNote deadlines={deadlines} papers={papers ?? []} />
        </div>
      </div>

      {/* ── Lower grid: stages + in-process ledger · deadlines + tally ── */}
      <div className="mt-8 grid gap-x-[52px] gap-y-9" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
        <div className="min-w-0">
          <StageFunnel stages={stats.stages} inprocCount={stats.inprocCount} />
          <InProcessLedger papers={papers ?? []} inprocCount={stats.inprocCount} />
        </div>
        <div className="min-w-0">
          <DeadlineTimeline deadlines={deadlines} />
          <RankTally tally={stats.tally} />
        </div>
      </div>

      {/* ── Footer seal ── */}
      <div
        className="mt-9 flex animate-pt-fade flex-col items-center gap-[5px] border-t border-rule pt-3.5"
        style={{ animationDelay: '1.1s' }}
      >
        <span className="text-[15px] text-seal">❦</span>
        <span className="font-mono text-[9px] tracking-[2px] text-muted">
          CẬP NHẬT {todayDots} — {stats.total} HỒ SƠ — IN TẠI XƯỞNG PAPERTRACK
        </span>
      </div>
    </div>
  )
}
