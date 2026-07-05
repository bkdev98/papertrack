import { PATHS } from '@/app/nav'
import { useOverlays } from '@/app/overlays'
import { CountdownCircle, ScreenHeader } from '@/components/ui'
import { useNotifications } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { formatDateDots, money } from '@papertrack/shared'
import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Notification preferences (persisted client-side) ────────────────────────
const NS_KEY = 'papertrack.ns'
type NsKey = 'deadline' | 'remind' | 'money' | 'watch'
type NsPrefs = Record<NsKey, boolean>
const DEFAULT_NS: NsPrefs = { deadline: true, remind: true, money: true, watch: true }

const TOGGLES: { key: NsKey; label: string }[] = [
  { key: 'deadline', label: 'Hạn nộp' },
  { key: 'remind', label: 'Chuyển bước' },
  { key: 'money', label: 'Thu chi' },
  { key: 'watch', label: 'Chờ lâu' },
]

function loadNs(): NsPrefs {
  try {
    const raw = localStorage.getItem(NS_KEY)
    if (!raw) return DEFAULT_NS
    return { ...DEFAULT_NS, ...(JSON.parse(raw) as Partial<NsPrefs>) }
  } catch {
    return DEFAULT_NS
  }
}

function useNsPrefs() {
  const [ns, setNs] = useState<NsPrefs>(loadNs)
  const toggle = useCallback((key: NsKey) => {
    setNs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(NS_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable — keep in-memory only */
      }
      return next
    })
  }, [])
  return { ns, toggle }
}

// ─── Row model ────────────────────────────────────────────────────────────────
interface NotifItem {
  key: string
  tag: string
  tagColor: string
  title: ReactNode
  sub: string
  action: string
  go: () => void
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export function NotificationsScreen() {
  const { data, isPending } = useNotifications()
  const { ns, toggle } = useNsPrefs()
  const navigate = useNavigate()
  const { openPaperDetail } = useOverlays()

  const urgentCards = useMemo(() => {
    if (!data || !ns.deadline) return []
    return data.urgent.map((d, i) => {
      const isConf = d.kind === 'conference'
      return {
        key: `urgent-${d.kind}-${d.id}`,
        days: d.days,
        title: d.name,
        sub: d.sub
          ? `${d.sub} — hạn ${formatDateDots(d.deadline)}`
          : `hạn ${formatDateDots(d.deadline)}`,
        action: isConf ? 'mở lịch hội thảo ↗' : 'mở special issue ↗',
        rot: i % 2 ? '0.5deg' : '-0.6deg',
        delay: 0.08 + i * 0.07,
        go: () => navigate(PATHS.catalog(isConf ? 'hoi-thao' : 'special-issue')),
      }
    })
  }, [data, ns.deadline, navigate])

  const remindItems = useMemo<NotifItem[]>(() => {
    if (!data) return []
    const out: NotifItem[] = []
    if (ns.remind) {
      for (const p of data.remind.accepted) {
        out.push({
          key: `accept-${p.id}`,
          tag: 'CHUYỂN BƯỚC',
          tagColor: '#5A6E3A',
          title: `“${p.title}” đã được chấp nhận`,
          sub: 'Kiểm tra phí xuất bản và chuyển sang Chờ công bố',
          action: 'mở hồ sơ ↗',
          go: () => openPaperDetail(p.id),
        })
      }
    }
    if (ns.deadline) {
      for (const d of data.remind.soon) {
        const isConf = d.kind === 'conference'
        out.push({
          key: `soon-${d.kind}-${d.id}`,
          tag: 'HẠN NỘP',
          tagColor: '#8A6D1F',
          title: d.name,
          sub: `Còn ${d.days} ngày — hạn ${formatDateDots(d.deadline)}`,
          action: 'mở lịch ↗',
          go: () => navigate(PATHS.catalog(isConf ? 'hoi-thao' : 'special-issue')),
        })
      }
    }
    if (ns.money) {
      for (const s of data.remind.settle) {
        if (s.pend < 0) {
          out.push({
            key: `collect-${s.author}`,
            tag: 'THU TIỀN',
            tagColor: '#A3382B',
            title: `Thu ${money(-s.pend)} từ ${s.author}`,
            sub: 'Khoản góp chi phí — xem Sổ thu chi nội bộ',
            action: 'mở sổ thu chi ↗',
            go: () => navigate(PATHS.finance('thu-chi')),
          })
        } else if (s.pend > 0) {
          out.push({
            key: `pay-${s.author}`,
            tag: 'CHI TRẢ',
            tagColor: '#5A6E3A',
            title: `Trả ${money(s.pend)} cho ${s.author}`,
            sub: 'Phần chia thưởng — xem Sổ thu chi nội bộ',
            action: 'mở sổ thu chi ↗',
            go: () => navigate(PATHS.finance('thu-chi')),
          })
        }
      }
    }
    return out
  }, [data, ns.remind, ns.deadline, ns.money, navigate, openPaperDetail])

  const watchItems = useMemo<NotifItem[]>(() => {
    if (!data || !ns.watch) return []
    return data.watch.map((p) => ({
      key: `watch-${p.id}`,
      tag: 'CHỜ LÂU',
      tagColor: '#77705F',
      title: `“${p.title}”`,
      sub: `Đã phản biện ${p.days} ngày — cân nhắc email ban biên tập`,
      action: 'mở hồ sơ ↗',
      go: () => openPaperDetail(p.id),
    }))
  }, [data, ns.watch, openPaperDetail])

  const allClear = !urgentCards.length && !remindItems.length && !watchItems.length

  const sections: {
    key: string
    label: string
    color: string
    items: NotifItem[]
    delay0: number
  }[] = [
    { key: 'remind', label: 'Nhắc việc', color: '#8A6D1F', items: remindItems, delay0: 0.2 },
    { key: 'watch', label: 'Theo dõi', color: '#77705F', items: watchItems, delay0: 0.3 },
  ]

  return (
    <div className="mx-auto max-w-[860px] animate-pt-page">
      <ScreenHeader watermark="!" eyebrow="Bảng nhắc việc" caption="tự tổng hợp từ dữ liệu sổ" />

      {/* Toggle row — Nhận nhắc về */}
      <div className="flex flex-wrap items-baseline gap-2 border-b border-rule-3 px-0.5 pb-1 pt-3">
        <span className="mr-1.5 font-mono text-[9px] uppercase tracking-[1.4px] text-faint">
          Nhận nhắc về
        </span>
        {TOGGLES.map((t) => {
          const on = ns[t.key]
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => toggle(t.key)}
              aria-pressed={on}
              className={cn(
                'group inline-flex cursor-pointer items-center gap-1.5 border px-2.5 py-1 max-sm:min-h-[44px] max-sm:px-3 font-mono text-[9px] uppercase tracking-[0.8px] transition-colors hover:border-ink hover:text-ink',
                on ? 'border-ink text-ink' : 'border-line text-faint',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'inline-block h-[9px] w-[9px] shrink-0 rounded-[1px] border transition-colors group-hover:border-ink',
                  on ? 'border-ink bg-ink' : 'border-current bg-transparent',
                )}
              />
              {t.label}
            </button>
          )
        })}
      </div>

      {isPending && !data && (
        <div className="px-0.5 py-16 text-center font-serif text-[13px] italic text-muted">
          Đang tổng hợp nhắc việc…
        </div>
      )}

      {data && (
        <>
          {allClear && (
            <div className="flex justify-center pb-10 pt-[70px]">
              <div
                className="animate-pt-stamp font-mono text-[14px] font-semibold uppercase tracking-[2.5px] text-positive"
                style={{
                  border: '3px solid var(--color-positive)',
                  borderRadius: '6px / 14px',
                  padding: '14px 26px',
                  mixBlendMode: 'multiply',
                  animationDelay: '0.3s',
                }}
              >
                Không có việc gấp ✓
              </div>
            </div>
          )}

          {/* Khẩn — hạn trong 15 ngày */}
          <SectionBar
            label="Khẩn — hạn trong 15 ngày"
            color="#A3382B"
            count={urgentCards.length}
            className="pb-3 pt-[22px]"
          />
          {urgentCards.length ? (
            <div className="grid grid-cols-1 gap-x-[18px] gap-y-4 pt-1.5 sm:grid-cols-2">
              {urgentCards.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.go}
                  className="relative flex animate-pt-fade items-center gap-3.5 border-[1.5px] border-seal bg-paper-card px-4 py-3.5 text-left shadow-[3px_3px_0_rgba(163,56,43,0.22)] transition-shadow hover:shadow-[5px_5px_0_rgba(163,56,43,0.35)]"
                  style={{ transform: `rotate(${c.rot})`, animationDelay: `${c.delay}s` }}
                >
                  <span
                    aria-hidden
                    className="absolute -top-[7px] left-5 h-[13px] w-[13px] rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 35% 30%, #C9584A, #7E241A)',
                      boxShadow: '1px 2px 3px rgba(34,29,20,0.35)',
                    }}
                  />
                  <CountdownCircle days={c.days} size={58} rotate="-4deg" className="shrink-0" />
                  <span className="block min-w-0">
                    <span className="block text-[14.5px] font-semibold leading-[1.35]">
                      {c.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] italic text-muted">{c.sub}</span>
                    <span className="mt-[5px] block font-script text-[16px] font-semibold text-seal">
                      {c.action}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-0.5 pb-2 pt-1 font-serif text-[13px] italic text-faint">
              Không có hạn nộp nào trong 15 ngày tới.
            </div>
          )}

          {/* Nhắc việc + Theo dõi */}
          {sections.map((s) => (
            <div key={s.key}>
              <SectionBar
                label={s.label}
                color={s.color}
                count={s.items.length}
                className="pb-2 pt-[26px]"
              />
              <div className="flex flex-col">
                {s.items.map((item, i) => (
                  <NotifRow key={item.key} item={item} delay={s.delay0 + Math.min(i, 12) * 0.04} />
                ))}
              </div>
              {!s.items.length && (
                <div className="px-1.5 py-2 font-serif text-[13px] italic text-faint">
                  Không có mục nào — yên tâm làm việc.
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ─── Section eyebrow with trailing rule ──────────────────────────────────────
function SectionBar({
  label,
  color,
  count,
  className,
}: {
  label: string
  color: string
  count: number
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline gap-2.5 px-0.5', className)}>
      <span className="font-mono text-[9.5px] uppercase tracking-[1.6px]" style={{ color }}>
        {label}
      </span>
      <span className="font-mono text-[10px] text-faint">· {count}</span>
      <span aria-hidden className="h-px flex-1 self-center bg-rule-3" />
    </div>
  )
}

// ─── A single reminder row ────────────────────────────────────────────────────
function NotifRow({ item, delay }: { item: NotifItem; delay: number }) {
  return (
    <button
      type="button"
      onClick={item.go}
      className="flex animate-pt-fade items-baseline gap-4 max-sm:flex-wrap max-sm:gap-y-1 border-b border-rule-3 px-1.5 py-3 text-left transition-colors hover:bg-[rgba(163,56,43,0.05)]"
      style={{ animationDelay: `${delay}s` }}
    >
      <span
        className="shrink-0 whitespace-nowrap border px-[7px] py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.8px]"
        style={{
          color: item.tagColor,
          borderColor: item.tagColor,
          borderWidth: '1.5px',
          borderRadius: '3px / 6px',
          transform: 'rotate(-1.5deg)',
        }}
      >
        {item.tag}
      </span>
      <span className="block min-w-0 flex-1">
        <span className="text-[14.5px] font-medium">{item.title}</span>
        <span className="mt-px block text-[12.5px] italic text-muted">{item.sub}</span>
      </span>
      <span className="shrink-0 whitespace-nowrap max-sm:basis-full font-script text-[16px] font-semibold text-seal">
        {item.action}
      </span>
    </button>
  )
}
