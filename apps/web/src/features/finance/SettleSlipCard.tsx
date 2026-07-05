import { Button } from '@/components/ui'
import { usePaperMutations } from '@/lib/queries'
import { cn } from '@/lib/utils'
import type { SettleAuthorRow, SettleSlip } from '@papertrack/shared'
import { formatDateDots, formatMoney, money, parseMoney } from '@papertrack/shared'

const SLIP_ROTATIONS = ['-0.5deg', '0.4deg', '-0.3deg', '0.6deg', '-0.6deg', '0.3deg']

// ─── Dotted-leader ledger line ───────────────────────────────────────────────
function Leader({
  label,
  value,
  strong,
  italic,
  color,
}: {
  label: string
  value: string
  strong?: boolean
  italic?: boolean
  color?: string
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={cn(
          'font-serif',
          strong
            ? 'text-[13.5px] font-medium text-ink'
            : italic
              ? 'text-[12px] italic text-muted'
              : 'text-[13px] text-muted',
        )}
      >
        {label}
      </span>
      <span className="mb-[3px] flex-1 self-end border-b border-dotted border-dotline" />
      <span
        className={cn(
          'font-mono tabular-nums',
          strong
            ? 'text-[11.5px] font-semibold text-ink'
            : cn(italic ? 'text-[10.5px]' : 'text-[11px]', color ?? 'text-ink'),
        )}
      >
        {value}
      </span>
    </div>
  )
}

/** Per-author settlement text + colour from the computed row. */
function amountText(row: SettleAuthorRow): { text: string; color: string } {
  if (row.kind === 'waiting' && row.paid === 0) return { text: 'chờ thưởng về', color: 'text-gold' }

  const dir = row.paid !== 0 ? row.paid : row.target
  const color = dir < 0 ? 'text-collect' : dir > 0 ? 'text-pay' : 'text-settled'

  if (row.paid !== 0 && row.pending === 0) {
    const verb = row.paid < 0 ? 'đã thu' : 'đã trả'
    const date = row.paidDate ? ` · ${formatDateDots(row.paidDate)}` : ''
    return { text: `✓ ${verb} ${money(Math.abs(row.paid))}${date}`, color }
  }
  if (row.paid !== 0 && row.pending !== 0) {
    const verb = row.pending < 0 ? 'còn thu' : 'còn trả'
    return { text: `${verb} ${money(Math.abs(row.pending))}`, color }
  }
  if (row.target < 0) return { text: `thu ${money(Math.abs(row.target))}`, color }
  if (row.target > 0) return { text: `trả ${money(row.target)}`, color }
  return { text: '✓ tất toán', color: 'text-settled' }
}

type SettlePay = ReturnType<typeof usePaperMutations>['settlePay']

// ─── One author row ──────────────────────────────────────────────────────────
function AuthorRow({
  paperId,
  row,
  settlePay,
}: { paperId: number; row: SettleAuthorRow; settlePay: SettlePay }) {
  const { text, color } = amountText(row)
  const busy = settlePay.isPending

  const record = () => settlePay.mutate({ id: paperId, author: row.author, amount: row.target })
  const cancel = () => settlePay.mutate({ id: paperId, author: row.author, amount: 0 })
  const partial = () => {
    const remaining = row.pending
    if (!remaining) return
    const raw = window.prompt(
      `Ghi một phần cho ${row.author} — số tiền tối đa ${formatMoney(Math.abs(remaining))} ₫:`,
      String(Math.abs(remaining)),
    )
    if (raw == null) return
    const val = parseMoney(raw)
    if (!val) return
    const delta = Math.min(val, Math.abs(remaining)) * (remaining < 0 ? -1 : 1)
    settlePay.mutate({ id: paperId, author: row.author, amount: row.paid + delta })
  }

  return (
    <div className="border-b border-rule/70 py-2 last:border-b-0">
      <div className="flex items-baseline gap-1.5 max-sm:flex-wrap">
        <span className="whitespace-nowrap font-script text-[19px] font-semibold text-ink-sig">
          {row.author}
        </span>
        <span className="mb-[4px] flex-1 self-end border-b border-dotted border-dotline" />
        <span
          className={cn(
            'whitespace-nowrap max-lg:whitespace-normal max-lg:text-right font-mono text-[10.5px]',
            color,
          )}
        >
          {text}
        </span>
      </div>
      {row.target !== 0 && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {row.paid !== 0 ? (
            <>
              {row.pending !== 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-sm:min-h-[44px] max-sm:px-4"
                  disabled={busy}
                  onClick={partial}
                >
                  ½ một phần
                </Button>
              )}
              <Button
                variant="ghost-red"
                size="sm"
                className="max-sm:min-h-[44px] max-sm:px-4"
                disabled={busy}
                onClick={cancel}
              >
                hủy
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                className="max-sm:min-h-[44px] max-sm:px-4"
                disabled={busy}
                onClick={record}
              >
                {row.target < 0 ? '✓ ghi đã thu' : '✓ ghi đã trả'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="max-sm:min-h-[44px] max-sm:px-4"
                disabled={busy}
                onClick={partial}
              >
                ½ một phần
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function SettleSlipCard({ slip, index }: { slip: SettleSlip; index: number }) {
  const { settleReward, settlePay } = usePaperMutations()
  const rotate = SLIP_ROTATIONS[index % SLIP_ROTATIONS.length]!
  const waiting = slip.rewardExpected > 0 && !slip.rewardReceived
  const share = slip.share
  const shareSign = share < 0 ? '−' : share > 0 ? '+' : ''

  const stamp = slip.settled && !waiting ? 'settled' : waiting ? 'waiting' : null

  return (
    <div
      className="relative animate-pt-fade bg-paper-card px-5 py-4 shadow-[2px_3px_10px_rgba(34,29,20,0.1)]"
      style={{
        transform: `rotate(${rotate})`,
        opacity: slip.settled ? 0.68 : 1,
        animationDelay: `${0.08 + index * 0.05}s`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[9px] uppercase tracking-[1.4px] text-faint">
            Phiếu quyết toán — hồ sơ №{slip.paperId}
          </div>
          <h3 className="mt-1 line-clamp-2 font-serif text-[15px] font-semibold leading-[1.35] text-ink">
            {slip.title}
          </h3>
          <div className="mt-0.5 font-serif text-[12px] italic text-muted">
            {slip.venue} · {slip.authorCount} tác giả
          </div>
        </div>
        {stamp && (
          <span
            className={cn(
              'stamp-edge animate-pt-stamp inline-block shrink-0 whitespace-nowrap border-[1.5px] px-[7px] py-[3px] font-mono text-[8.5px] font-semibold uppercase tracking-[1.2px] opacity-85',
              stamp === 'settled' ? 'border-positive text-positive' : 'border-gold text-gold',
            )}
            style={{ transform: 'rotate(-3deg)', animationDelay: `${0.4 + index * 0.05}s` }}
          >
            {stamp === 'settled' ? 'Tất toán' : 'Chờ thưởng'}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[300px_1fr]">
        {/* Left ledger */}
        <div>
          <Leader label="Thưởng" value={money(slip.rewardExpected)} />
          <Leader label="Chi phí quỹ đã ứng" value={money(slip.cost)} />
          <div className="double-rule mt-2 pt-2">
            <Leader label="Ròng" value={money(slip.net)} strong />
            <Leader
              label="mỗi phần"
              value={`${shareSign}${money(Math.abs(share))} / người`}
              italic
              color={share < 0 ? 'text-collect' : share > 0 ? 'text-pay' : 'text-settled'}
            />
          </div>
          {slip.rewardExpected > 0 && (
            <button
              type="button"
              onClick={() =>
                settleReward.mutate({ id: slip.paperId, received: !slip.rewardReceived })
              }
              disabled={settleReward.isPending}
              className={cn(
                'mt-3 inline-flex cursor-pointer items-center border px-2.5 py-1.5 max-sm:min-h-[44px] max-sm:px-3.5 font-mono text-[9px] uppercase tracking-[0.8px] transition-colors disabled:opacity-55',
                slip.rewardReceived
                  ? 'border-positive text-positive hover:bg-[rgba(62,110,69,0.08)]'
                  : 'border-line text-muted hover:border-ink hover:text-ink',
              )}
            >
              {slip.rewardReceived ? '✓ Thưởng đã về quỹ' : '☐ Thưởng đã về quỹ?'}
            </button>
          )}
        </div>

        {/* Right per-author rows */}
        <div>
          {slip.rows.map((row) => (
            <AuthorRow key={row.author} paperId={slip.paperId} row={row} settlePay={settlePay} />
          ))}
        </div>
      </div>
    </div>
  )
}
