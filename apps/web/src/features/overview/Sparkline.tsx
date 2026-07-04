import type { OverviewStats } from '@papertrack/shared'

/** 12-month submission sparkline: 12 bars, current month in seal red, with a
 *  handwritten peak note and mono start/end labels. */
export function Sparkline({ spark }: { spark: OverviewStats['spark'] }) {
  const { months, peak, total } = spark
  const max = peak?.count ?? 0
  const yy = (year: number) => String(year).slice(2)
  const start = months[0]
  const end = months[months.length - 1]
  if (!start || !end) return null

  return (
    <div className="mt-6 animate-pt-fade" style={{ animationDelay: '0.8s' }}>
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="font-mono text-[8.5px] tracking-[1.6px] text-muted">
          NHỊP NỘP BÀI · 12 THÁNG
        </span>
        {total > 0 && peak && (
          <span
            className="font-script text-[14.5px] font-semibold text-seal"
            style={{ transform: 'rotate(-1.5deg)' }}
          >
            đỉnh T{peak.month}: {peak.count} bài
          </span>
        )}
      </div>

      <div
        className="mt-[9px] flex items-end gap-1 border-b-[1.5px] border-ink"
        style={{ height: 52 }}
      >
        {months.map((m, i) => {
          const current = i === months.length - 1
          const h = max
            ? Math.max(Math.round((m.count / max) * 100), m.count ? 10 : 4)
            : m.count
              ? 10
              : 4
          const opacity = m.count === 0 ? 0.15 : current ? 0.95 : 0.72
          return (
            <div
              key={m.key}
              title={`Tháng ${m.month}/${m.year}: ${m.count} bài`}
              className="flex-1"
              style={{
                height: `${h}%`,
                background: current ? 'var(--color-seal)' : 'var(--color-ink)',
                opacity,
              }}
            />
          )
        })}
      </div>

      <div className="mt-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[8px] tracking-[1px] text-faint">
          T{start.month}/{yy(start.year)}
        </span>
        <span className="font-serif text-[11.5px] italic text-muted">{total} bài đã nộp</span>
        <span className="font-mono text-[8px] tracking-[1px] text-faint">
          T{end.month}/{yy(end.year)}
        </span>
      </div>
    </div>
  )
}
