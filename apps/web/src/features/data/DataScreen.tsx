import { ScreenHeader, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { useDataMutations, useInventory } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { type ChangeEvent, type ReactNode, useRef } from 'react'

export function DataScreen() {
  const { data: inv } = useInventory()
  const dataOps = useDataMutations()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)

  const counts: { label: string; n: number | undefined }[] = [
    { label: 'Bài báo', n: inv?.papers },
    { label: 'Tạp chí', n: inv?.journals },
    { label: 'Hội thảo', n: inv?.conferences },
    { label: 'Special Issue / Chương sách', n: inv?.specialIssues },
    { label: 'Tác giả', n: inv?.authors },
    { label: 'Danh mục khen thưởng', n: inv?.rewardCategories },
  ]

  async function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    let bundle: unknown
    try {
      bundle = JSON.parse(await file.text())
    } catch {
      toast.show('File không hợp lệ', 'danger')
      return
    }
    if (!bundle || typeof bundle !== 'object' || !('papers' in (bundle as object))) {
      toast.show('File không hợp lệ', 'danger')
      return
    }
    if (!window.confirm('Thay thế toàn bộ dữ liệu hiện tại bằng file này?')) return

    dataOps.import.mutate(bundle, {
      onSuccess: () => toast.show('Đã nhập dữ liệu'),
      onError: () => toast.show('File không hợp lệ', 'danger'),
    })
  }

  function onReset() {
    if (!window.confirm('Khôi phục dữ liệu mẫu? Dữ liệu hiện tại sẽ bị thay thế.')) return
    dataOps.reset.mutate(undefined, {
      onSuccess: () => toast.show('Đã khôi phục dữ liệu mẫu'),
      onError: () => toast.show('Không thể khôi phục dữ liệu', 'danger'),
    })
  }

  function onClear() {
    if (!window.confirm('XÓA TOÀN BỘ dữ liệu? Hãy xuất file trước khi xóa.')) return
    if (!window.confirm('Xác nhận lần 2: chắc chắn xóa tất cả?')) return
    dataOps.clear.mutate(undefined, {
      onSuccess: () => toast.show('Đã xóa toàn bộ dữ liệu'),
      onError: () => toast.show('Không thể xóa dữ liệu', 'danger'),
    })
  }

  // Fetch the export, verify it before saving, and only then confirm success.
  // A plain `<a download>` would save a 401/500 error body *as* the file and the
  // user would never know — dangerous next to the "export before clearing" guidance.
  async function onExport(url: string, okMsg: string) {
    try {
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const name = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? url.split('/').pop() ?? 'papertrack'
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
      toast.show(okMsg)
    } catch {
      toast.show('Không thể xuất file — thử lại', 'danger')
    }
  }

  const busy = dataOps.import.isPending || dataOps.reset.isPending || dataOps.clear.isPending

  return (
    <div className="mx-auto max-w-[860px] animate-pt-page">
      <ScreenHeader
        watermark="D"
        eyebrow="Kho dữ liệu"
        caption="tự lưu vào máy chủ sau mỗi thay đổi"
      />

      <div className="mt-[22px] grid grid-cols-1 gap-11 sm:grid-cols-2">
        {/* ── Kiểm kê ── */}
        <div>
          <ColumnHeading>Kiểm kê</ColumnHeading>
          {counts.map((c) => (
            <div
              key={c.label}
              className="flex items-baseline justify-between border-b border-rule-3 px-0.5 py-2.5"
            >
              <span className="text-[14.5px]">{c.label}</span>
              <span className="font-mono text-[12px]">{c.n ?? '—'}</span>
            </div>
          ))}
        </div>

        {/* ── Thao tác ── */}
        <div className="flex flex-col gap-3.5">
          <ColumnHeading>Thao tác</ColumnHeading>

          <button
            type="button"
            onClick={() => onExport(api.data.exportUrl, 'Đã xuất file JSON')}
            className={cn(actionBase, actionTone.dark)}
          >
            ↓ Xuất file JSON
          </button>

          <button
            type="button"
            onClick={() => onExport(api.data.exportXlsxUrl, 'Đã xuất file Excel')}
            className={cn(actionBase, actionTone.ghost)}
          >
            ↓ Xuất file Excel (.xlsx)
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className={cn(actionBase, actionTone.ghost)}
          >
            ↑ Nhập file JSON (thay thế)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={onImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={onReset}
            disabled={busy}
            className={cn(actionBase, actionTone.muted)}
          >
            ⟳ Khôi phục dữ liệu gốc (25/05/2026)
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            className={cn(actionBase, actionTone.danger)}
          >
            ✕ Xóa toàn bộ dữ liệu
          </button>

          <div className="font-serif text-[12.5px] italic text-muted">
            Nên xuất file JSON trước khi xóa hoặc thay thế dữ liệu.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Column eyebrow ───────────────────────────────────────────────────────────
function ColumnHeading({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-rule-2 pb-2 font-mono text-[9.5px] uppercase tracking-[1.6px] text-muted">
      {children}
    </div>
  )
}

// ─── Full-width, left-aligned action buttons (Thao tác column) ────────────────
const actionBase =
  'block w-full cursor-pointer px-4 py-[11px] max-sm:min-h-[44px] text-left font-mono text-[10.5px] uppercase tracking-[1px] ' +
  'transition-all duration-[180ms] disabled:pointer-events-none disabled:opacity-55'

const actionTone = {
  dark:
    'bg-ink text-paper shadow-[3px_3px_0_rgba(163,56,43,0.85)] ' +
    'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_rgba(163,56,43,0.85)]',
  ghost: 'border border-ink text-ink hover:bg-ink hover:text-paper',
  muted: 'border border-line text-muted hover:border-ink hover:text-ink',
  danger: 'border border-seal text-seal hover:bg-seal hover:text-paper',
} as const
