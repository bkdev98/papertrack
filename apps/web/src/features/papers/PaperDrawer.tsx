import {
  Avatar,
  Button,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  PaymentPill,
  RankChip,
  StatusStamp,
  statusColor,
  useToast,
} from '@/components/ui'
import { api } from '@/lib/api'
import {
  useAttachmentMutations,
  useAuthors,
  usePaper,
  usePaperMutations,
  useRewardCategories,
} from '@/lib/queries'
import { cn } from '@/lib/utils'
import {
  type Attachment,
  PIPELINE,
  formatDateDots,
  matchRewardCategory,
  money,
  nextStatus,
  pipelineIndex,
} from '@papertrack/shared'
import type { ReactNode } from 'react'

const DELETE_CONFIRM = 'Xóa hồ sơ này khỏi sổ? Không thể hoàn tác.'

export function PaperDrawer({
  paperId,
  onClose,
  onEdit,
  onBack,
}: {
  paperId: number | null
  onClose: () => void
  onEdit: (id: number) => void
  /** Set when opened over a parent drawer — renders a back button in the header. */
  onBack?: () => void
}) {
  const { data: paper } = usePaper(paperId)
  const authors = useAuthors().data ?? []
  const rewardCats = useRewardCategories().data
  const { advance, reject, restore, remove } = usePaperMutations()
  const { upload, remove: removeAttachment } = useAttachmentMutations(paperId ?? 0)
  const toast = useToast()

  const open = paperId != null

  function onUpload(file: File) {
    upload.mutate(file, { onSuccess: () => toast.show('Đã đính kèm tệp') })
  }

  return (
    <Drawer open={open} onClose={onClose} width={440} label={`Chi tiết hồ sơ №${paperId ?? ''}`}>
      <DrawerHeader
        tab={`Hồ sơ №${paperId ?? ''}`}
        sub="tập hồ sơ công bố"
        onClose={onClose}
        onBack={onBack}
      />
      {!paper ? (
        <DrawerBody>
          <p className="font-serif text-[14px] italic text-muted">Đang tải…</p>
        </DrawerBody>
      ) : (
        (() => {
          const pi = pipelineIndex(paper.status)
          const isRejected = paper.status === 'Từ chối'
          const next = nextStatus(paper.status)
          const cat = matchRewardCategory(paper.rank, paper.type, rewardCats ?? undefined)
          const rewardText = cat
            ? `${money(cat.amount)} — ${cat.name}`
            : 'Chưa xác định — chọn phân loại'
          const total = paper.costs.apc + paper.costs.conf + paper.costs.other
          const hasArchive = !!(
            paper.link ||
            paper.publink ||
            paper.localpath ||
            paper.role ||
            paper.payment
          )
          const linkIsUrl = /^https?:\/\//.test(paper.link || '')
          const publinkIsUrl = /^https?:\/\//.test(paper.publink || '')

          const route = PIPELINE.map((st, idx) => {
            const passed = pi > idx
            const current = pi === idx
            const dateISO = paper.history?.[st]
            return {
              label: st,
              mark: passed ? '✓' : current ? '●' : '',
              markColor: passed
                ? 'var(--color-seal)'
                : current
                  ? statusColor(st)
                  : 'var(--color-line)',
              labelColor: passed
                ? 'var(--color-ink)'
                : current
                  ? statusColor(st)
                  : 'var(--color-faint)',
              weight: current ? 600 : 400,
              dateF: dateISO ? formatDateDots(dateISO) : pi >= idx ? '—' : '',
              dateColor: current ? statusColor(st) : 'var(--color-muted-2)',
            }
          })
          if (isRejected) {
            const rejISO = paper.history?.['Từ chối']
            route.push({
              label: 'Từ chối',
              mark: '✕',
              markColor: 'var(--color-seal)',
              labelColor: 'var(--color-seal)',
              weight: 600,
              dateF: rejISO ? formatDateDots(rejISO) : '—',
              dateColor: 'var(--color-seal)',
            })
          }

          return (
            <>
              <DrawerBody>
                {/* Title block + pinned status stamp */}
                <div className="relative">
                  <div className="absolute right-0 top-0">
                    <StatusStamp
                      status={paper.status}
                      short={false}
                      className="!border-[2.5px] !px-[11px] !py-[6px] !text-[10.5px] !tracking-[1.8px] font-semibold [border-radius:4px/9px]"
                    />
                  </div>
                  <div className="pr-[118px] font-serif text-[21px] font-semibold leading-[1.35] text-ink">
                    {paper.title}
                  </div>
                  <div className="mt-1.5 font-serif text-[14px] italic text-muted">
                    {paper.venue} · {paper.type}
                  </div>
                  <div className="mt-3 flex items-baseline gap-2.5">
                    <RankChip rank={paper.rank} />
                    <span className="font-mono text-[10px] text-faint">
                      nộp {formatDateDots(paper.date)}
                    </span>
                  </div>
                </div>

                {/* Lộ trình hồ sơ */}
                <Section
                  eyebrow="Lộ trình hồ sơ"
                  right={
                    <span className="font-serif text-[11px] italic text-faint">
                      di chuột để xem ngày
                    </span>
                  }
                >
                  <div className="flex flex-col gap-1.5">
                    {route.map((r) => (
                      <div key={r.label} className="group flex items-baseline gap-2.5">
                        <span
                          className="w-[18px] shrink-0 text-center font-script text-[19px] font-semibold leading-none"
                          style={{ color: r.markColor }}
                        >
                          {r.mark}
                        </span>
                        <span
                          className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[1.2px]"
                          style={{ color: r.labelColor, fontWeight: r.weight }}
                        >
                          {r.label}
                        </span>
                        <span
                          className="flex-1 border-b border-dotted border-rule"
                          style={{ transform: 'translateY(-3px)' }}
                        />
                        <span
                          className="whitespace-nowrap font-mono text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ color: r.dateColor }}
                        >
                          {r.dateF}
                        </span>
                      </div>
                    ))}
                  </div>
                  {(next || isRejected) && (
                    <div className="mt-3.5 flex gap-2.5">
                      {next && (
                        <button
                          type="button"
                          onClick={() =>
                            advance.mutate(paper.id, {
                              onSuccess: () => toast.show(`Đã chuyển sang “${next}”`),
                            })
                          }
                          className="cursor-pointer whitespace-nowrap border border-seal px-[11px] py-1.5 font-mono text-[9.5px] uppercase tracking-[0.8px] text-seal transition-all hover:bg-seal hover:text-paper"
                        >
                          Chuyển: {next} →
                        </button>
                      )}
                      {isRejected && (
                        <button
                          type="button"
                          onClick={() =>
                            restore.mutate(paper.id, {
                              onSuccess: () => toast.show('Đã khôi phục về Nộp bài'),
                            })
                          }
                          className="cursor-pointer whitespace-nowrap border border-st-ca px-[11px] py-1.5 font-mono text-[9.5px] uppercase tracking-[0.8px] text-st-ca transition-all hover:bg-st-ca hover:text-paper"
                        >
                          Khôi phục — Nộp bài
                        </button>
                      )}
                    </div>
                  )}
                </Section>

                {/* Chữ ký tác giả */}
                <Section eyebrow="Chữ ký tác giả">
                  {paper.authors.length ? (
                    <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                      {paper.authors.map((name) => {
                        const unit = authors.find((a) => a.name === name)?.unit ?? ''
                        return (
                          <div key={name} className="flex items-start gap-2.5">
                            <Avatar name={name} size={30} framed />
                            <div className="min-w-0">
                              <div
                                className="border-b border-dotted border-dotline px-0.5 pb-0.5 font-script text-[20.5px] font-semibold text-ink-sig"
                                style={{ transform: 'rotate(-1deg)' }}
                              >
                                {name}
                              </div>
                              {unit && (
                                <div className="mt-1 font-serif text-[11px] italic text-faint">
                                  {unit}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="font-serif text-[12.5px] italic text-faint">
                      — chưa ghi tác giả —
                    </div>
                  )}
                </Section>

                {/* Khen thưởng dự kiến */}
                <Section eyebrow="Khen thưởng dự kiến">
                  <div className="text-[15px]">{rewardText}</div>
                </Section>

                {/* Biên lai chi phí */}
                <div
                  className="mt-[22px] border border-rule bg-paper-card"
                  style={{
                    transform: 'rotate(0.6deg)',
                    boxShadow: '0 2px 8px rgba(34,29,20,0.08)',
                  }}
                >
                  <div className="flex items-baseline justify-between border-b border-dashed border-line px-3.5 py-2">
                    <span className="font-mono text-[9px] uppercase tracking-[1.6px]">
                      Biên lai chi phí
                    </span>
                    <span className="font-mono text-[9px] text-faint">✂ ─ ─ ─ ─</span>
                  </div>
                  <div className="flex flex-col gap-1.5 px-3.5 pb-3 pt-2.5">
                    <ReceiptRow label="APC" value={dash(paper.costs.apc)} />
                    <ReceiptRow label="Hội nghị" value={dash(paper.costs.conf)} />
                    <ReceiptRow label="Hiệu đính / khác" value={dash(paper.costs.other)} />
                    <div className="mt-0.5 flex items-baseline justify-between border-t-[3px] border-double border-line pt-1.5">
                      <span className="text-[14px] font-medium">Tổng</span>
                      <span className="font-mono text-[12px] font-semibold">{money(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Liên kết & lưu trữ */}
                {hasArchive && (
                  <Section eyebrow="Liên kết & lưu trữ">
                    <div className="flex flex-col gap-2">
                      {paper.role && (
                        <ReceiptRow
                          label="Vai trò của tôi"
                          value={paper.role}
                          valueClass="!text-[10.5px]"
                        />
                      )}
                      {paper.payment && (
                        <div className="flex items-baseline justify-between">
                          <span className="whitespace-nowrap text-[13.5px] text-muted">
                            Thanh toán
                          </span>
                          <span
                            className="mx-2 flex-1 border-b border-dotted border-rule-2"
                            style={{ transform: 'translateY(-3px)' }}
                          />
                          <PaymentPill payment={paper.payment} />
                        </div>
                      )}
                      {paper.link &&
                        (linkIsUrl ? (
                          <a
                            href={paper.link}
                            target="_blank"
                            rel="noreferrer"
                            className="self-start border-b border-dotted border-link font-script text-[18px] font-semibold text-link transition-opacity hover:opacity-70"
                          >
                            ↗ trang nộp bài / hệ thống tạp chí
                          </a>
                        ) : (
                          <div className="font-serif text-[12px] italic leading-[1.45] text-muted-2">
                            {paper.link}
                          </div>
                        ))}
                      {publinkIsUrl && (
                        <a
                          href={paper.publink}
                          target="_blank"
                          rel="noreferrer"
                          className="self-start border-b border-dotted border-st-pub font-script text-[18px] font-semibold text-st-pub transition-opacity hover:opacity-70"
                        >
                          ↗ bản công bố
                        </a>
                      )}
                      {paper.localpath && (
                        <div className="break-all border border-dashed border-line-chip bg-paper-chip px-2.5 py-1.5 font-mono text-[9.5px] leading-[1.5] text-muted-2">
                          🗀 {paper.localpath}
                        </div>
                      )}
                    </div>
                  </Section>
                )}

                {/* Handwritten note */}
                {paper.note && (
                  <div
                    className="relative mt-[22px] bg-paper px-4 pb-2.5 pt-4"
                    style={{
                      transform: 'rotate(-0.8deg)',
                      boxShadow: '0 2px 8px rgba(34,29,20,0.12)',
                    }}
                  >
                    <span
                      className="washi-tape absolute left-1/2 top-[-9px] h-5 w-[70px]"
                      style={{ transform: 'translateX(-50%) rotate(2deg)' }}
                    />
                    <div className="font-script text-[18.5px] font-semibold leading-[1.45] text-ink-note">
                      {paper.note}
                    </div>
                  </div>
                )}

                {/* DOI */}
                {paper.doi && (
                  <div className="mt-[18px] font-mono text-[10.5px] text-muted">
                    DOI: <span className="text-link">{paper.doi}</span>
                  </div>
                )}

                {/* Attachments */}
                <Section eyebrow="Tệp đính kèm">
                  {paper.attachments.length ? (
                    <div className="flex flex-col gap-3">
                      {paper.attachments.map((att) => (
                        <AttachmentRow
                          key={att.id}
                          att={att}
                          onRemove={() => removeAttachment.mutate(att.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="font-serif text-[12.5px] italic text-faint">
                      — chưa có tệp —
                    </div>
                  )}
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 border border-dashed border-line-chip bg-paper-chip px-3 py-2 font-mono text-[9.5px] uppercase tracking-[1.2px] text-muted transition-colors hover:border-ink hover:text-ink">
                    {upload.isPending ? 'Đang tải lên…' : '+ Đính kèm tệp'}
                    <input
                      type="file"
                      className="hidden"
                      disabled={upload.isPending}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onUpload(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </Section>
              </DrawerBody>

              <DrawerFooter>
                <Button
                  variant="primary"
                  className="flex-1 !text-[10px]"
                  onClick={() => onEdit(paper.id)}
                >
                  ✎ Sửa hồ sơ
                </Button>
                {!isRejected && (
                  <Button
                    variant="ghost-red"
                    className="!text-[10px]"
                    onClick={() =>
                      reject.mutate(paper.id, {
                        onSuccess: () => toast.show('Đã đánh dấu Từ chối'),
                      })
                    }
                  >
                    Từ chối
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="!text-[10px]"
                  onClick={() => {
                    if (!window.confirm(DELETE_CONFIRM)) return
                    remove.mutate(paper.id, {
                      onSuccess: () => {
                        toast.show('Đã xóa hồ sơ')
                        onClose()
                      },
                    })
                  }}
                >
                  Xóa
                </Button>
              </DrawerFooter>
            </>
          )
        })()
      )}
    </Drawer>
  )
}

// ─── local presentational helpers ──────────────────────────────────────────────

function Section({
  eyebrow,
  right,
  children,
}: { eyebrow: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-5 border-t border-rule pt-3">
      <div className="flex items-baseline gap-2.5">
        <div className="font-mono text-[9px] uppercase tracking-[1.6px] text-muted">{eyebrow}</div>
        {right}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  )
}

function ReceiptRow({
  label,
  value,
  valueClass,
}: { label: ReactNode; value: ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="whitespace-nowrap text-[13.5px] text-muted">{label}</span>
      <span
        className="mx-2 flex-1 border-b border-dotted border-rule-2"
        style={{ transform: 'translateY(-3px)' }}
      />
      <span className={cn('whitespace-nowrap font-mono text-[11.5px]', valueClass)}>{value}</span>
    </div>
  )
}

function AttachmentRow({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  const url = api.attachments.downloadUrl(att.id)
  const isImage = att.contentType.startsWith('image/')
  const isPdf = att.contentType === 'application/pdf'
  return (
    <div className="border-b border-rule-3 pb-2.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px]" title={att.filename}>
          {att.filename}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-faint">{formatBytes(att.size)}</span>
        <a
          href={url}
          download
          className="shrink-0 font-mono text-[10px] text-link hover:opacity-70"
        >
          ↓ tải
        </a>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Gỡ tệp"
          className="shrink-0 cursor-pointer text-[12px] leading-none text-faint transition-colors hover:text-seal"
        >
          ✕
        </button>
      </div>
      {isImage && (
        <img
          src={url}
          alt={att.filename}
          className="mt-2 max-h-40 rounded-[2px] border border-rule object-contain"
        />
      )}
      {isPdf && (
        <embed src={url} type="application/pdf" className="mt-2 h-48 w-full border border-rule" />
      )}
    </div>
  )
}

function dash(n: number): string {
  return n ? money(n) : '—'
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
