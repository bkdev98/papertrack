import { cn } from '@/lib/utils'

/** Windowed page list: [0, '…', 3,4,5, '…', 11] */
function windowPages(current: number, count: number): (number | '…')[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i)
  const out: (number | '…')[] = [0]
  const lo = Math.max(1, current - 1)
  const hi = Math.min(count - 2, current + 1)
  if (lo > 1) out.push('…')
  for (let i = lo; i <= hi; i++) out.push(i)
  if (hi < count - 2) out.push('…')
  out.push(count - 1)
  return out
}

export function Pager({
  total,
  pageSize,
  page,
  onPage,
  noun = 'mục',
}: {
  total: number
  pageSize: number
  page: number
  onPage: (p: number) => void
  noun?: string
}) {
  const count = Math.ceil(total / pageSize)
  if (count <= 1) return null
  const lo = page * pageSize + 1
  const hi = Math.min(total, (page + 1) * pageSize)

  const shared =
    'font-mono cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default'
  // Prev/next: 9.5px uppercase, tracked. Page numbers: 11px, plain (matches the ledger paper feel).
  const navChip = cn(shared, 'text-[9.5px] uppercase tracking-[1.2px]')
  const pageChip = cn(shared, 'text-[11px]')

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <span className="font-serif text-[12.5px] italic text-faint">
        {noun} {lo}–{hi} trong {total} — tờ {page + 1}/{count}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(navChip, 'text-muted hover:text-seal')}
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
        >
          ‹ Tờ trước
        </button>
        {windowPages(page, count).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="font-mono text-[11px] text-faint">
              ···
            </span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() => onPage(p)}
              className={cn(
                pageChip,
                p === page ? 'wobble-ring px-1.5 text-seal' : 'text-muted hover:text-seal',
              )}
            >
              {p + 1}
            </button>
          ),
        )}
        <button
          type="button"
          className={cn(navChip, 'text-muted hover:text-seal')}
          disabled={page >= count - 1}
          onClick={() => onPage(page + 1)}
        >
          Tờ sau ›
        </button>
      </div>
    </div>
  )
}
