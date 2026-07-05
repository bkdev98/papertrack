import { useOverlays } from '@/app/overlays'
import { Drawer, DrawerHeader, Markdown } from '@/components/ui'
import { useAskLedger, usePapers } from '@/lib/queries'
import { pad } from '@papertrack/shared'
import { useEffect, useRef, useState } from 'react'

/** A few starter questions in the ledger's own register — single owner. */
const EXAMPLES = [
  'Tổng thưởng dự kiến năm nay là bao nhiêu?',
  'Bài nào đang phản biện lâu nhất?',
  'Còn khoản phí nào chưa trả?',
  'Ai đang được nợ nhiều nhất?',
]

/** One exchange in the running conversation. `answer` is empty while pending. */
interface Turn {
  id: string
  question: string
  answer: string
  paperIds: number[]
  pending?: boolean
  error?: boolean
}

const STORE_KEY = 'papertrack.ask.thread'

function loadThread(): Turn[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * "Hỏi sổ" — a dedicated conversation drawer over the ledger. The server grounds
 * every turn in a freshly-computed deterministic snapshot; the transcript is kept
 * locally so the owner's questions persist across sessions and follow-ups carry
 * context. Cited papers open the detail drawer over this one.
 */
export function AskDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [thread, setThread] = useState<Turn[]>(loadThread)
  const [q, setQ] = useState('')
  const ask = useAskLedger()
  const papers = usePapers().data ?? []
  const { openPaperDetail } = useOverlays()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Persist the settled transcript (a pending turn is transient).
  useEffect(() => {
    const settled = thread.filter((t) => !t.pending)
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(settled))
    } catch {
      // storage full / unavailable — the in-memory thread still works this session.
    }
  }, [thread])

  // Keep the newest turn in view as the conversation grows.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on every append
  useEffect(() => {
    if (open)
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [thread, open])

  async function send(text?: string) {
    const question = (text ?? q).trim()
    if (!question || ask.isPending) return
    setQ('')
    const history = thread
      .filter((t) => !t.pending && !t.error && t.answer)
      .flatMap((t) => [
        { role: 'user' as const, content: t.question },
        { role: 'assistant' as const, content: t.answer },
      ])
    const id = crypto.randomUUID()
    setThread((prev) => [...prev, { id, question, answer: '', paperIds: [], pending: true }])
    try {
      const res = await ask.mutateAsync({ question, history })
      setThread((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                pending: false,
                answer: res.answer,
                paperIds: res.paperIds,
                error: Boolean(res.error) || res.enabled === false,
              }
            : t,
        ),
      )
    } catch {
      setThread((prev) =>
        prev.map((t) => (t.id === id ? { ...t, pending: false, error: true } : t)),
      )
    }
  }

  const clear = () => {
    setThread([])
    try {
      localStorage.removeItem(STORE_KEY)
    } catch {
      // ignore
    }
  }

  return (
    <Drawer open={open} onClose={onClose} width={508} label="Hỏi sổ">
      <DrawerHeader
        tab={
          <span className="inline-flex items-center gap-1.5">
            <span className="text-[12px] leading-none text-seal">❧</span>
            Hỏi sổ
          </span>
        }
        sub="trò chuyện với sổ"
        onClose={onClose}
        right={
          thread.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="cursor-pointer font-mono text-[9px] uppercase tracking-[1.2px] text-faint transition-colors hover:text-seal"
            >
              Xóa lịch sử
            </button>
          )
        }
      />

      <div ref={scrollRef} className="flex-1 space-y-7 overflow-y-auto px-5 py-6">
        {thread.length === 0 && !ask.isPending ? (
          <EmptyState onPick={send} />
        ) : (
          thread.map((t) => (
            <TurnBlock key={t.id} turn={t} papers={papers} onOpenPaper={openPaperDetail} />
          ))
        )}
      </div>

      <div className="border-t border-line bg-paper-head px-5 pb-3 pt-3.5">
        <div className="flex items-end gap-2">
          <textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            placeholder="Hỏi sổ một câu…"
            aria-label="Câu hỏi cho sổ"
            className="min-h-[40px] max-h-32 min-w-0 flex-1 resize-none rounded-[3px] border border-line bg-paper-note px-3.5 py-2.5 font-serif text-[13.5px] max-sm:text-[16px] leading-[1.5] text-ink shadow-[inset_0_1px_2px_rgba(34,29,20,0.04)] outline-none transition-colors focus:border-seal placeholder:italic placeholder:text-faint"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={ask.isPending || !q.trim()}
            aria-label="Gửi câu hỏi"
            className="shadow-stamp flex h-[40px] max-sm:h-[44px] shrink-0 cursor-pointer items-center gap-1.5 bg-ink px-4 font-mono text-[10.5px] uppercase tracking-[1px] text-paper transition-all duration-[160ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_rgba(163,56,43,0.85)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55"
          >
            <span className={ask.isPending ? 'animate-pulse' : ''}>
              {ask.isPending ? '…' : 'Hỏi'}
            </span>
          </button>
        </div>
        <div className="mt-1.5 pl-0.5 font-mono text-[8px] uppercase tracking-[1px] text-faint">
          Enter gửi · Shift+Enter xuống dòng
        </div>
      </div>
    </Drawer>
  )
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="animate-pt-fade relative pt-10 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 select-none font-display text-[110px] italic leading-none text-ink/[0.05]"
      >
        ?
      </span>
      <div className="relative">
        <div className="text-[26px] leading-none text-seal">❧</div>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[1.8px] text-ink">Hỏi sổ</div>
        <p className="mx-auto mt-2 max-w-[290px] font-serif text-[13.5px] italic leading-[1.55] text-muted">
          Hỏi bất cứ điều gì về sổ — thưởng, phí, tiến độ phản biện, thanh toán. Sổ trả lời từ dữ
          liệu đã ghi.
        </p>

        <div className="mx-auto mt-7 max-w-[330px]">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="h-px flex-1 bg-rule" />
            <span className="font-mono text-[8.5px] uppercase tracking-[1.6px] text-faint">
              thử hỏi
            </span>
            <span className="h-px flex-1 bg-rule" />
          </div>
          <div className="flex flex-col gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => onPick(ex)}
                className="group flex items-center gap-2.5 rounded-[3px] border border-dotted border-line bg-paper-note/40 px-3 py-2 text-left transition-all duration-[160ms] hover:border-seal hover:bg-paper-note active:scale-[0.99]"
              >
                <span className="font-mono text-[12px] leading-none text-seal transition-transform duration-200 group-hover:translate-x-0.5">
                  ›
                </span>
                <span className="font-serif text-[12.5px] italic text-muted transition-colors group-hover:text-ink">
                  {ex}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function TurnBlock({
  turn,
  papers,
  onOpenPaper,
}: {
  turn: Turn
  papers: { id: number; title: string; venue: string }[]
  onOpenPaper: (id: number) => void
}) {
  const cited = turn.paperIds
    .map((id) => {
      const idx = papers.findIndex((p) => p.id === id)
      return idx === -1 ? null : { paper: papers[idx], no: pad(idx + 1) }
    })
    .filter((x): x is { paper: (typeof papers)[number]; no: string } => x !== null)

  return (
    <div className="space-y-3">
      {/* The owner's question — a slip pinned to the right, with a mono tab. */}
      <div className="flex flex-col items-end">
        <span className="mb-1 mr-1 font-mono text-[8px] uppercase tracking-[1.6px] text-faint">
          Bạn hỏi
        </span>
        <div className="max-w-[85%] rounded-[11px_11px_3px_11px] border border-line bg-paper-chip px-3.5 py-2 font-serif text-[13px] leading-[1.5] text-ink shadow-[0_1px_3px_rgba(34,29,20,0.08)]">
          {turn.question}
        </div>
      </div>

      {/* The ledger's answer — a page bound at the red margin. */}
      <div className="relative overflow-hidden rounded-r-[4px] border-l-2 border-seal/40 bg-paper-note/40 py-3 pl-4 pr-3.5">
        <div className="mb-2 flex items-center gap-1.5">
          <span className="text-[10px] leading-none text-seal">❧</span>
          <span className="font-mono text-[8.5px] uppercase tracking-[1.6px] text-faint">
            Sổ trả lời
          </span>
        </div>
        {turn.pending ? (
          <div className="flex items-center gap-2 py-0.5 font-serif text-[12.5px] italic text-muted">
            <span className="inline-flex items-center gap-0.5">
              <Dot delay="0ms" />
              <Dot delay="150ms" />
              <Dot delay="300ms" />
            </span>
            đang tra sổ
          </div>
        ) : turn.error ? (
          <div className="font-serif text-[13px] italic text-seal">
            Không tra được câu này — thử hỏi lại.
          </div>
        ) : (
          <div className="animate-pt-ink">
            <Markdown text={turn.answer} />
          </div>
        )}

        {cited.length > 0 && (
          <div className="mt-3.5 border-t border-rule pt-3">
            <div className="mb-2 font-mono text-[8.5px] uppercase tracking-[1.6px] text-faint">
              Bài liên quan
            </div>
            <div className="-mx-1.5 space-y-0.5">
              {cited.map(({ paper, no }) => (
                <button
                  key={paper.id}
                  type="button"
                  onClick={() => onOpenPaper(paper.id)}
                  className="group flex w-full items-baseline gap-2 rounded-[3px] px-1.5 py-1 text-left transition-colors hover:bg-[rgba(163,56,43,0.06)]"
                >
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-faint transition-colors group-hover:text-seal">
                    №{no}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-serif text-[12.5px] text-ink transition-colors group-hover:text-seal">
                    {paper.title}
                  </span>
                  <span className="shrink-0 max-sm:max-w-[45%] max-sm:truncate pl-1 font-serif text-[11px] italic text-faint">
                    {paper.venue}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-[3px] w-[3px] animate-pulse rounded-full bg-seal"
      style={{ animationDelay: delay, animationDuration: '900ms' }}
    />
  )
}
