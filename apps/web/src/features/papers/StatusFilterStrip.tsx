import { InkRing } from '@/components/ui'
import { cn } from '@/lib/utils'
import { type Paper, STATUS_META, type Status } from '@papertrack/shared'
import { useMemo } from 'react'

/**
 * Quick-filter row: "Tất cả" + every status valid for the group. Each cell is a
 * big Spectral count beside a mono uppercase label; the selected count gets a
 * hand-drawn ink ring that strokes itself on. Zero-count non-"all" cells dim.
 * Counts reflect the search-filtered set.
 */
export function StatusFilterStrip({
  papers,
  statuses,
  selected,
  onSelect,
}: {
  papers: Paper[]
  statuses: readonly Status[]
  selected: Status | 'all'
  onSelect: (s: Status | 'all') => void
}) {
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of statuses) m[s] = 0
    for (const p of papers) {
      const cur = m[p.status]
      if (cur !== undefined) m[p.status] = cur + 1
    }
    return m
  }, [papers, statuses])

  const cells: { key: Status | 'all'; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: papers.length },
    ...statuses.map((s) => ({ key: s, label: STATUS_META[s].label, count: counts[s] ?? 0 })),
  ]

  return (
    <div className="mb-5">
      {/* thick ink line the band hangs from */}
      <div className="h-[1.5px] bg-ink" />
      <div className="flex items-stretch overflow-x-auto border-b border-ink max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
        {cells.map((c) => {
          const active = selected === c.key
          const dim = c.key !== 'all' && c.count === 0
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(c.key)}
              className={cn(
                'flex shrink-0 cursor-pointer items-baseline gap-2 whitespace-nowrap border-r border-rule-3 pb-[13px] pl-4 pr-[18px] pt-[14px] transition-colors hover:bg-[rgba(163,56,43,0.05)]',
                dim && 'opacity-45',
              )}
            >
              <span
                className={cn(
                  'relative inline-block px-0.5 font-serif text-[21px] font-medium leading-none tabular-nums',
                  active ? 'text-seal' : 'text-ink',
                )}
              >
                {c.count}
                {active && <InkRing />}
              </span>
              <span
                className={cn(
                  'font-mono text-[8.5px] uppercase tracking-[1.1px]',
                  active ? 'text-seal' : 'text-muted',
                )}
              >
                {c.label}
              </span>
            </button>
          )
        })}
        <span
          aria-hidden
          className="hidden min-w-[36px] flex-1 sm:block"
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent 0 6px, rgba(34,29,20,0.045) 6px 7px)',
          }}
        />
      </div>
    </div>
  )
}
