import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  StatusStamp,
  statusColor,
  useToast,
} from '@/components/ui'
import { api } from '@/lib/api'
import {
  useAiStatus,
  useAuthors,
  useConferences,
  useJournals,
  usePaper,
  usePaperMutations,
  usePapers,
  useRewardCategories,
} from '@/lib/queries'
import { cn } from '@/lib/utils'
import {
  DEFAULT_REWARD_CATEGORIES,
  PIPELINE,
  type PaperDraft,
  type PaperInput,
  type PaperType,
  type Status,
  formatDateSigned,
  matchRewardCategory,
  money,
  pad,
  parseMoney,
} from '@papertrack/shared'
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

interface FormState {
  title: string
  type: PaperType
  status: Status
  venue: string
  rank: string
  date: string
  apc: string
  conf: string
  other: string
  note: string
  doi: string
  authors: string[]
}

const EMPTY: FormState = {
  title: '',
  type: 'Tạp chí',
  status: 'Nộp bài',
  venue: '',
  rank: '',
  date: '',
  apc: '',
  conf: '',
  other: '',
  note: '',
  doi: '',
  authors: [],
}

const STATUS_OPTIONS: Status[] = [...PIPELINE, 'Từ chối']

/** Bigram Dice similarity on NFC-normalized, punctuation-stripped titles (`_sim`). */
function dice(a: string, b: string): number {
  const grams = (s: string): Set<string> => {
    const t = s
      .toLowerCase()
      .normalize('NFC')
      .replace(/[^\p{L}\p{N} ]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const g = new Set<string>()
    for (let i = 0; i < t.length - 1; i++) g.add(t.slice(i, i + 2))
    return g
  }
  const A = grams(a)
  const B = grams(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const x of A) {
    if (B.has(x)) inter++
  }
  return (2 * inter) / (A.size + B.size)
}

export function PaperModal({
  editId,
  onClose,
  onSaved,
}: {
  editId: number | 'new' | null
  onClose: () => void
  onSaved: (id?: number) => void
}) {
  const editingId = typeof editId === 'number' ? editId : null
  const { data: paper } = usePaper(editingId)
  const papers = usePapers().data ?? []
  const journals = useJournals().data ?? []
  const conferences = useConferences().data ?? []
  const authors = useAuthors().data ?? []
  const rewardCats = useRewardCategories().data ?? DEFAULT_REWARD_CATEGORIES
  const { create, update } = usePaperMutations()
  const toast = useToast()
  const aiEnabled = useAiStatus().data?.enabled ?? false

  const [form, setForm] = useState<FormState | null>(null)
  const [error, setError] = useState('')
  const [authorInput, setAuthorInput] = useState('')
  const [rankHintMsg, setRankHintMsg] = useState('')
  const [rankBusy, setRankBusy] = useState(false)
  const initFor = useRef<number | 'new' | null>(null)

  // Prefill once per open: EMPTY for new, the loaded paper for edit.
  useEffect(() => {
    if (editId == null) {
      initFor.current = null
      return
    }
    if (editId === 'new' && initFor.current !== 'new') {
      initFor.current = 'new'
      setForm(EMPTY)
      setError('')
      setAuthorInput('')
      setRankHintMsg('')
    } else if (typeof editId === 'number' && paper && initFor.current !== editId) {
      initFor.current = editId
      setForm({
        title: paper.title,
        type: paper.type,
        status: paper.status,
        venue: paper.venue,
        rank: paper.rank || '',
        date: paper.date || '',
        apc: paper.costs.apc ? String(paper.costs.apc) : '',
        conf: paper.costs.conf ? String(paper.costs.conf) : '',
        other: paper.costs.other ? String(paper.costs.other) : '',
        note: paper.note || '',
        doi: paper.doi || '',
        authors: [...paper.authors],
      })
      setError('')
      setAuthorInput('')
    }
  }, [editId, paper])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f))
    setError('')
  }

  const authorNames = useMemo(() => [...new Set(authors.map((a) => a.name))], [authors])
  const venueNames = useMemo(
    () => [...new Set([...journals.map((j) => j.name), ...conferences.map((c) => c.name)])],
    [journals, conferences],
  )
  const rankOptions = useMemo(() => rewardCats.map((r) => r.abbr), [rewardCats])

  // Non-destructively merge an autofilled draft: fill only empty fields, append
  // new authors. The owner reviews everything before saving.
  function applyDraft(d: PaperDraft) {
    setForm((f) =>
      f
        ? {
            ...f,
            title: f.title.trim() ? f.title : (d.title ?? f.title),
            type: d.type ?? f.type,
            venue: f.venue.trim() ? f.venue : (d.venue ?? f.venue),
            rank: f.rank.trim() ? f.rank : (d.rank ?? f.rank),
            date: f.date.trim() ? f.date : (d.date ?? f.date),
            doi: f.doi.trim() ? f.doi : (d.doi ?? f.doi),
            authors: [...f.authors, ...(d.authors ?? []).filter((a) => !f.authors.includes(a))],
          }
        : f,
    )
    setError('')
    setRankHintMsg('')
  }

  async function suggestRankNow() {
    if (!form?.venue.trim() || rankBusy) return
    setRankBusy(true)
    setRankHintMsg('')
    try {
      const { suggestion } = await api.ai.suggestRank(
        form.venue.trim(),
        form.doi.trim() || undefined,
      )
      if (suggestion?.rank && rankOptions.includes(suggestion.rank)) {
        set('rank', suggestion.rank)
        setRankHintMsg(
          `Gợi ý: ${suggestion.rank} (${suggestion.confidence}) — ${suggestion.reason}`,
        )
      } else {
        setRankHintMsg(`Chưa chắc — ${suggestion?.reason || 'nên tự kiểm tra danh mục.'}`)
      }
    } catch {
      setRankHintMsg('Lỗi khi gợi ý hạng.')
    } finally {
      setRankBusy(false)
    }
  }

  const cat = form ? matchRewardCategory(form.rank, form.type, rewardCats) : null
  const rewardHint = cat ? `thưởng ${money(cat.amount)}` : ''

  const dup = useMemo(() => {
    if (!form || form.title.trim().length <= 10) return null
    let best: { sc: number; title: string } | null = null
    for (const p of papers) {
      if (editingId != null && p.id === editingId) continue
      const sc = dice(form.title, p.title)
      if (sc >= 0.55 && (!best || sc > best.sc)) best = { sc, title: p.title }
    }
    return best
  }, [form, papers, editingId])

  const pfNo = pad(
    editingId != null ? papers.findIndex((p) => p.id === editingId) + 1 : papers.length + 1,
  )
  const modalSub =
    editId === 'new'
      ? 'đăng ký hồ sơ mới vào sổ theo dõi công bố'
      : 'chỉnh sửa hồ sơ đã có trong sổ theo dõi'
  const costTotal = form ? parseMoney(form.apc) + parseMoney(form.conf) + parseMoney(form.other) : 0

  function addAuthor(raw: string) {
    const v = raw.trim()
    if (!v) return
    setForm((f) => (f && !f.authors.includes(v) ? { ...f, authors: [...f.authors, v] } : f))
    setAuthorInput('')
  }
  function onAuthorChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    if (authorNames.includes(v) && form && !form.authors.includes(v)) addAuthor(v)
    else setAuthorInput(v)
  }
  function onAuthorKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addAuthor(authorInput)
    }
  }

  function save() {
    if (!form) return
    if (!form.title.trim()) {
      setError('Thiếu tên bài báo')
      return
    }
    if (!form.venue.trim()) {
      setError('Thiếu tạp chí / hội thảo')
      return
    }
    const edited = {
      title: form.title.trim(),
      type: form.type,
      status: form.status,
      venue: form.venue.trim(),
      rank: form.rank,
      date: form.date,
      authors: form.authors,
      costs: {
        apc: parseMoney(form.apc),
        conf: parseMoney(form.conf),
        other: parseMoney(form.other),
      },
      note: form.note,
      doi: form.doi,
    }
    if (editingId != null) {
      update.mutate(
        { id: editingId, data: edited },
        {
          onSuccess: () => {
            onSaved(editingId)
            toast.show('Đã ghi vào sổ')
          },
        },
      )
    } else {
      const payload: PaperInput = {
        ...edited,
        link: '',
        publink: '',
        localpath: '',
        role: '',
        payment: '',
        apcEntries: [],
        history: {},
      }
      create.mutate(payload, {
        onSuccess: (saved) => {
          onSaved(saved.id)
          toast.show('Đã ghi vào sổ')
        },
      })
    }
  }

  const authorOpts = form ? authorNames.filter((n) => !form.authors.includes(n)) : []

  return (
    <Modal open={editId != null} onClose={onClose} maxWidth={880} label="Ghi vào sổ công bố">
      <ModalHeader
        title="Ghi vào sổ công bố"
        sub={modalSub}
        right={
          <div className="flex flex-col items-end leading-none">
            <span className="font-mono text-[8px] uppercase tracking-[2px] text-seal">SỐ HIỆU</span>
            <span className="font-serif text-[29px] font-medium italic text-seal">№{pfNo}</span>
          </div>
        }
        onClose={onClose}
      />
      {!form ? (
        <ModalBody>
          <p className="font-serif text-[14px] italic text-muted">Đang tải…</p>
        </ModalBody>
      ) : (
        <>
          <ModalBody>
            {editId === 'new' && <AutofillBar aiEnabled={aiEnabled} onApply={applyDraft} />}
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_240px] md:gap-0">
              {/* LEFT */}
              <div className="md:pr-[30px]">
                {/* (1) Tên bài báo */}
                <FieldLabel n="(1)">Tên bài báo *</FieldLabel>
                <textarea
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  rows={3}
                  aria-label="Tên bài báo"
                  placeholder="Viết tiêu đề lên dòng kẻ…"
                  className="w-full resize-y border-none font-serif text-[18px] font-medium italic text-ink outline-none placeholder:text-faint"
                  style={{
                    background:
                      'repeating-linear-gradient(180deg, transparent 0 31px, var(--color-ruled) 31px 32px)',
                    backgroundAttachment: 'local',
                    lineHeight: '32px',
                    minHeight: 96,
                    padding: '2px 2px 0',
                  }}
                />
                {dup && (
                  <div className="mt-1.5 flex animate-pt-fade items-baseline gap-2 border border-dashed border-seal bg-[rgba(163,56,43,0.05)] px-2.5 py-1.5">
                    <span className="shrink-0 border border-seal px-1.5 py-px font-mono text-[8.5px] tracking-[1px] text-seal">
                      TRÙNG?
                    </span>
                    <span className="font-serif text-[12.5px] italic leading-[1.45] text-seal">
                      Có thể trùng với hồ sơ “{dup.title}” ({Math.round(dup.sc * 100)}% giống)
                    </span>
                  </div>
                )}

                {/* (2) Venue */}
                <div className="mt-[18px]">
                  <FieldLabel n="(2)">Tạp chí / Hội thảo *</FieldLabel>
                  <Input
                    value={form.venue}
                    onChange={(e) => set('venue', e.target.value)}
                    list="pt-venues"
                    aria-label="Tạp chí hoặc hội thảo"
                    placeholder="Gõ để tìm trong danh mục…"
                    className="!text-[15.5px] max-sm:!text-[16px]"
                  />
                  <datalist id="pt-venues">
                    {venueNames.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>

                {/* (3) Tiến độ */}
                <div className="mt-5">
                  <FieldLabel n="(3)">Tiến độ — đóng dấu một ô</FieldLabel>
                  <div className="mt-2 flex flex-wrap gap-[7px]">
                    {STATUS_OPTIONS.map((s) => {
                      const sel = form.status === s
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={sel}
                          onClick={() => set('status', s)}
                          className={cn(
                            'cursor-pointer whitespace-nowrap border-[1.5px] px-[9px] py-1 font-mono text-[8.5px] uppercase tracking-[0.8px] transition-all [border-radius:3px/7px] max-sm:py-2',
                            !sel && 'border-rule text-muted-2 hover:border-ink hover:text-ink',
                          )}
                          style={
                            sel
                              ? {
                                  borderColor: statusColor(s),
                                  color: statusColor(s),
                                  fontWeight: 600,
                                  transform: 'rotate(-1.5deg)',
                                  mixBlendMode: 'multiply',
                                }
                              : { mixBlendMode: 'multiply' }
                          }
                        >
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* (4) Tác giả ký tên */}
                <div className="mt-5">
                  <FieldLabel n="(4)">Tác giả ký tên</FieldLabel>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
                    {form.authors.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-baseline gap-[7px] border-b border-dotted border-dotline px-0.5 pb-[3px] pt-0.5"
                      >
                        <span
                          className="font-script text-[19px] font-semibold text-ink-sig"
                          style={{ transform: 'rotate(-1deg)' }}
                        >
                          {name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            set(
                              'authors',
                              form.authors.filter((x) => x !== name),
                            )
                          }
                          aria-label={`Bỏ ${name}`}
                          className="cursor-pointer text-[11px] leading-none text-faint transition-colors hover:text-seal max-sm:p-1.5 max-sm:-my-1.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                    <input
                      value={authorInput}
                      onChange={onAuthorChange}
                      onKeyDown={onAuthorKey}
                      list="pt-authors"
                      aria-label="Thêm tác giả"
                      placeholder="+ gõ tên để thêm…"
                      className="w-[200px] border-b border-dotted border-dotline bg-transparent px-0.5 py-1 font-serif text-[14px] max-sm:text-[16px] italic text-ink outline-none transition-colors focus:border-seal placeholder:text-faint"
                    />
                    <datalist id="pt-authors">
                      {authorOpts.map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
                  </div>
                  <div className="mt-1.5 font-serif text-[11.5px] italic text-faint">
                    chọn từ danh bạ, hoặc gõ tên rồi nhấn Enter
                  </div>
                </div>

                {/* Note */}
                <div
                  className="relative mt-[26px] max-w-[420px] bg-paper px-4 pb-3 pt-[18px]"
                  style={{
                    transform: 'rotate(-0.8deg)',
                    boxShadow: '0 3px 10px rgba(34,29,20,0.13)',
                  }}
                >
                  <span
                    className="washi-tape absolute left-1/2 top-[-10px] h-[21px] w-20"
                    style={{ transform: 'translateX(-50%) rotate(-2.5deg)' }}
                  />
                  <div className="mb-0.5 font-mono text-[8px] tracking-[1.6px] text-faint">
                    GHI CHÚ KÈM HỒ SƠ
                  </div>
                  <input
                    value={form.note}
                    onChange={(e) => set('note', e.target.value)}
                    aria-label="Ghi chú kèm hồ sơ"
                    placeholder="viết tay vài dòng…"
                    className="w-full bg-transparent py-0.5 font-script text-[19px] font-semibold text-ink-note outline-none placeholder:text-faint"
                  />
                </div>
              </div>

              {/* RIGHT rail */}
              <div className="flex flex-col gap-[19px] md:border-l md:border-dashed md:border-[rgba(163,56,43,0.4)] md:pl-[26px]">
                {/* Preview stamp */}
                <div
                  className="flex items-center justify-center self-center border-[1.5px] border-dashed border-faint"
                  style={{ width: 112, height: 76, transform: 'rotate(1.5deg)' }}
                >
                  <StatusStamp
                    key={form.status}
                    status={form.status}
                    short={false}
                    className="!px-2 !py-[5px] !text-[8.5px] !tracking-[1px] [border-radius:4px/8px]"
                  />
                </div>

                {/* Loại */}
                <div>
                  <RailLabel>Loại</RailLabel>
                  <div className="flex gap-2">
                    {(['Tạp chí', 'Hội thảo'] as PaperType[]).map((t) => {
                      const sel = form.type === t
                      return (
                        <button
                          key={t}
                          type="button"
                          aria-pressed={sel}
                          onClick={() => set('type', t)}
                          className={cn(
                            'cursor-pointer border-[1.5px] px-[11px] py-[5px] font-mono text-[9px] uppercase tracking-[0.8px] transition-all [border-radius:3px/7px] max-sm:py-2',
                            sel
                              ? 'border-ink bg-paper-abbr text-ink'
                              : 'border-line text-muted-2 hover:border-ink hover:text-ink',
                          )}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Ngày nộp */}
                <div>
                  <RailLabel>Ngày nộp</RailLabel>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                    aria-label="Ngày nộp"
                    className="w-full border-b border-dotted border-dotline bg-transparent px-0.5 py-[5px] font-mono text-[12.5px] max-sm:text-[16px] text-ink outline-none transition-colors focus:border-seal"
                  />
                </div>

                {/* Phân loại */}
                <div>
                  <div className="flex items-center justify-between">
                    <RailLabel>Phân loại</RailLabel>
                    {aiEnabled && form.venue.trim() && (
                      <button
                        type="button"
                        onClick={suggestRankNow}
                        disabled={rankBusy}
                        className="cursor-pointer font-serif text-[11px] italic text-muted transition-colors hover:text-seal disabled:opacity-50"
                      >
                        {rankBusy ? '✨ đang gợi ý…' : '✨ gợi ý hạng'}
                      </button>
                    )}
                  </div>
                  <select
                    value={form.rank}
                    onChange={(e) => set('rank', e.target.value)}
                    aria-label="Phân loại"
                    className="w-full cursor-pointer border-b border-dotted border-dotline bg-transparent px-0.5 py-[5px] font-mono text-[12.5px] max-sm:text-[16px] text-ink outline-none transition-colors focus:border-seal"
                  >
                    <option value="">— chọn —</option>
                    {rankOptions.map((abbr) => (
                      <option key={abbr} value={abbr}>
                        {abbr}
                      </option>
                    ))}
                  </select>
                  {rankHintMsg && (
                    <div className="mt-1.5 font-serif text-[11px] italic leading-snug text-muted">
                      {rankHintMsg}
                    </div>
                  )}
                  {rewardHint && (
                    <div
                      className="mt-[7px] font-script text-[17.5px] font-semibold text-seal"
                      style={{ transform: 'rotate(-1.5deg)' }}
                    >
                      {rewardHint}
                    </div>
                  )}
                </div>

                {/* Chi phí */}
                <div
                  className="border border-rule bg-paper-card"
                  style={{
                    transform: 'rotate(0.6deg)',
                    boxShadow: '0 2px 8px rgba(34,29,20,0.08)',
                  }}
                >
                  <div className="flex items-baseline justify-between border-b border-dashed border-line px-3 py-[7px]">
                    <span className="font-mono text-[8.5px] uppercase tracking-[1.4px]">
                      Chi phí (₫)
                    </span>
                    <span className="font-mono text-[9px] text-faint">✂ ─ ─</span>
                  </div>
                  <div className="flex flex-col gap-[7px] px-3 pb-[11px] pt-2.5">
                    <CostInput label="APC" value={form.apc} onChange={(v) => set('apc', v)} />
                    <CostInput
                      label="Hội nghị"
                      value={form.conf}
                      onChange={(v) => set('conf', v)}
                    />
                    <CostInput
                      label="Hiệu đính"
                      value={form.other}
                      onChange={(v) => set('other', v)}
                    />
                    <div className="mt-0.5 flex items-baseline justify-between border-t-[3px] border-double border-line pt-1.5">
                      <span className="text-[12.5px] font-medium">Tổng</span>
                      <span className="font-mono text-[11.5px] font-semibold">
                        {money(costTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DOI */}
                <div>
                  <RailLabel>DOI</RailLabel>
                  <input
                    value={form.doi}
                    onChange={(e) => set('doi', e.target.value)}
                    aria-label="DOI"
                    placeholder="10.…"
                    className="w-full border-b border-dotted border-dotline bg-transparent px-0.5 py-[5px] font-mono text-[11.5px] max-sm:text-[16px] text-ink outline-none transition-colors focus:border-seal placeholder:text-faint"
                  />
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="max-sm:flex-wrap">
            <span className="mr-auto max-sm:basis-full font-serif text-[12.5px] italic text-seal">
              {error}
            </span>
            <span className="font-serif text-[12.5px] italic text-faint">
              {formatDateSigned(new Date())}
            </span>
            <Button variant="ghost" className="!text-[10px]" onClick={onClose}>
              Hủy
            </Button>
            <Button
              variant="primary"
              className="!text-[10px]"
              onClick={save}
              disabled={create.isPending || update.isPending}
            >
              ✎ Ký &amp; lưu vào sổ
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  )
}

// ─── local presentational helpers ──────────────────────────────────────────────

function FieldLabel({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="mb-0.5 font-mono text-[9px] uppercase tracking-[1.6px] text-muted">
      <span className="text-seal">{n}</span> {children}
    </div>
  )
}

function RailLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-0.5 font-mono text-[9px] uppercase tracking-[1.6px] text-muted">
      {children}
    </div>
  )
}

function CostInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-[12.5px] text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        inputMode="numeric"
        aria-label={`Chi phí: ${label}`}
        className="min-w-0 flex-1 border-b border-dotted border-rule-2 bg-transparent px-0.5 py-0.5 text-right font-mono text-[11.5px] max-sm:text-[16px] text-ink outline-none transition-colors focus:border-seal placeholder:text-faint"
      />
    </div>
  )
}

/** Paste a DOI or a citation and pre-fill the form. DOIs resolve via Crossref
 *  (deterministic, no token); free text needs AI. Fills empty fields only. */
function AutofillBar({
  aiEnabled,
  onApply,
}: {
  aiEnabled: boolean
  onApply: (d: PaperDraft) => void
}) {
  const [source, setSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function run() {
    const s = source.trim()
    if (!s || busy) return
    setBusy(true)
    setMsg('')
    try {
      const { draft, source: from } = await api.ai.extractPaper(s)
      const filled = Boolean(draft.title || draft.venue || draft.doi || draft.authors?.length)
      if (!filled) {
        setMsg('Không tìm thấy dữ liệu — nhập tay bên dưới.')
        return
      }
      onApply(draft)
      setMsg(
        from === 'crossref' ? 'Đã điền từ Crossref theo DOI.' : 'Đã điền từ AI — nên kiểm tra lại.',
      )
      setSource('')
    } catch {
      setMsg('Không điền được — thử lại hoặc nhập tay.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-5 rounded-[3px] border border-dotted border-line bg-[rgba(163,56,43,0.03)] px-3 py-2.5">
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[1.6px] text-seal">
          ✨ Tự động điền
        </span>
        <span className="font-serif text-[11px] italic text-faint">
          {aiEnabled ? 'dán DOI hoặc trích dẫn' : 'dán DOI'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              run()
            }
          }}
          placeholder={
            aiEnabled
              ? 'Dán DOI hoặc trích dẫn rồi bấm Điền…'
              : 'Dán DOI (vd. 10.1145/…) rồi bấm Điền…'
          }
          aria-label="Nguồn tự động điền"
          className="min-w-0 flex-1 border-b border-dotted border-dotline bg-transparent px-0.5 py-[5px] font-mono text-[11.5px] max-sm:text-[16px] text-ink outline-none transition-colors focus:border-seal placeholder:text-faint"
        />
        <Button variant="ghost" size="sm" onClick={run} disabled={busy || !source.trim()}>
          {busy ? '…' : 'Điền'}
        </Button>
      </div>
      {msg && <div className="mt-1.5 font-serif text-[11px] italic text-muted">{msg}</div>}
    </div>
  )
}
