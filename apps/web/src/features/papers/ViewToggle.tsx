import { cn } from '@/lib/utils'

export type PaperView = 'ledger' | 'kanban'

/** SỔ CÁI / PHIẾU switch — active tab gets a red seal underline. */
export function ViewToggle({
  value,
  onChange,
}: { value: PaperView; onChange: (v: PaperView) => void }) {
  const opts: { key: PaperView; label: string }[] = [
    { key: 'ledger', label: 'Sổ cái' },
    { key: 'kanban', label: 'Phiếu' },
  ]
  return (
    <div className="flex items-center gap-4">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'cursor-pointer border-b-2 pb-0.5 font-mono text-[10px] uppercase tracking-[1.2px] transition-colors max-sm:pt-2 max-sm:pb-2 max-sm:-my-2',
            value === o.key
              ? 'border-seal text-ink'
              : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
