import { Avatar, Money, Pager, ScreenHeader, Section } from '@/components/ui'
import { useAuthors, useSettlement } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { money } from '@papertrack/shared'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SettleSlipCard } from './SettleSlipCard'

const SLIPS_PER_PAGE = 6

const FOOTNOTE =
  'Quy ước: quỹ (do chủ trì giữ) ứng toàn bộ chi phí và nhận tiền thưởng của trường; ' +
  'phần ròng = thưởng thực nhận − chi phí, chia đều theo số tác giả. ' +
  'Ròng âm → thu từ mỗi tác giả; ròng dương → chi trả cho mỗi tác giả. ' +
  'Khi tiền thưởng về quỹ, số còn thu / còn trả tự cập nhật lại.'

const EMPTY =
  'Chưa có khoản thu chi nào — thêm chi phí vào hồ sơ, hoặc chờ bài có từ 2 tác giả đạt mức thưởng.'

// ─── Top summary tile ────────────────────────────────────────────────────────
function SummaryTile({
  eyebrow,
  value,
  sub,
  color,
  delay,
}: {
  eyebrow: string
  value: string
  sub: string
  color: string
  delay: number
}) {
  return (
    <div
      className="animate-pt-up border-b border-rule pb-3"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="font-mono text-[9.5px] uppercase tracking-[1.6px] text-muted">{eyebrow}</div>
      <Money
        value={value}
        className={cn('mt-1 block font-serif text-[30px] font-medium leading-[1.1]', color)}
      />
      <div className="mt-1 font-serif text-[12px] italic text-muted">{sub}</div>
    </div>
  )
}

// ─── Author reconciliation chip (rotated, color-coded border, opens the author) ─
function AuthorChip({
  name,
  pend,
  index,
  onOpen,
}: {
  name: string
  pend: number
  index: number
  onOpen: () => void
}) {
  const text =
    pend < 0 ? `cần thu ${money(-pend)}` : pend > 0 ? `cần trả ${money(pend)}` : '✓ tất toán'
  // Text vs border are color-coded separately: settled text is muted (#8A8377)
  // but its border is a neutral hairline (#C9C2B2), matching the design.
  const color = pend < 0 ? 'text-collect' : pend > 0 ? 'text-pay' : 'text-settled'
  const borderColor =
    pend < 0 ? 'var(--color-collect)' : pend > 0 ? 'var(--color-pay)' : 'var(--color-line)'
  const rot = index % 2 ? '0.8deg' : '-0.8deg'
  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Xem tác giả ${name}`}
      className="flex animate-pt-fade cursor-pointer items-center gap-[9px] border bg-paper pb-[7px] pl-2 pr-[13px] pt-[6px] text-left shadow-[2px_2px_0_rgba(34,29,20,0.07)] transition-shadow duration-[180ms] hover:shadow-[3px_3px_0_rgba(163,56,43,0.4)]"
      style={{
        transform: `rotate(${rot})`,
        borderColor,
        animationDelay: `${(0.26 + index * 0.05).toFixed(2)}s`,
      }}
    >
      <Avatar name={name} size={30} framed />
      <div className="leading-tight">
        <div className="font-script text-[19px] font-semibold leading-[1.1] text-ink-sig">
          {name}
        </div>
        <div className={cn('mt-[3px] font-mono text-[9.5px] tracking-[0.4px]', color)}>{text}</div>
      </div>
    </button>
  )
}

export function SettleScreen() {
  const { data: settlement } = useSettlement()
  const authors = useAuthors().data ?? []
  const navigate = useNavigate()
  const [page, setPage] = useState(0)

  // Map catalog authors by name so a chip can deep-link to that author's drawer.
  const authorIdByName = useMemo(() => new Map(authors.map((a) => [a.name, a.id])), [authors])
  const openAuthor = (name: string) => {
    const id = authorIdByName.get(name)
    navigate(id != null ? `/danh-muc/tac-gia?open=${id}` : '/danh-muc/tac-gia')
  }

  return (
    <div className="animate-pt-page mx-auto max-w-[1000px]">
      <ScreenHeader
        watermark="₫"
        eyebrow="Sổ thu chi nội bộ"
        caption="quỹ công bố — chủ trì ứng chi phí & nhận thưởng, phần ròng chia đều theo tác giả"
      />

      {!settlement ? (
        <p className="py-24 text-center font-serif text-[14px] italic text-muted">Đang mở sổ…</p>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
            <SummaryTile
              eyebrow="Cần thu về quỹ"
              value={money(settlement.collect.amount)}
              sub={`${settlement.collect.count} khoản chưa thu`}
              color="text-collect"
              delay={0.08}
            />
            <SummaryTile
              eyebrow="Cần chi trả"
              value={money(settlement.pay.amount)}
              sub={`${settlement.pay.count} khoản chưa trả`}
              color="text-pay"
              delay={0.16}
            />
            <SummaryTile
              eyebrow="Đã tất toán"
              value={String(settlement.done.count)}
              sub="khoản đã ghi sổ"
              color="text-settled"
              delay={0.24}
            />
          </div>

          {/* Author reconciliation */}
          {Object.keys(settlement.authors).length > 0 && (
            <Section eyebrow="Đối chiếu theo tác giả" compact className="mt-9">
              <div className="flex flex-wrap gap-3">
                {Object.entries(settlement.authors).map(([name, { pend }], i) => (
                  <AuthorChip
                    key={name}
                    name={name}
                    pend={pend}
                    index={i}
                    onOpen={() => openAuthor(name)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Settlement slips */}
          <div className="mt-9">
            {settlement.slips.length === 0 ? (
              <p className="border border-dashed border-rule-2 px-5 py-10 text-center font-serif text-[13.5px] italic text-muted">
                {EMPTY}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {settlement.slips
                  .slice(page * SLIPS_PER_PAGE, page * SLIPS_PER_PAGE + SLIPS_PER_PAGE)
                  .map((slip, i) => (
                    <SettleSlipCard key={slip.paperId} slip={slip} index={i} />
                  ))}
              </div>
            )}

            <Pager
              total={settlement.slips.length}
              pageSize={SLIPS_PER_PAGE}
              page={page}
              onPage={setPage}
              noun="phiếu"
            />

            <p className="mt-8 font-serif text-[12.5px] italic leading-normal text-faint">
              {FOOTNOTE}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
