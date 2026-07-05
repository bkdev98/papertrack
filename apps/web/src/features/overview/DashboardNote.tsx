import { Button, StickyNote, useToast } from '@/components/ui'
import { useBriefing, useNote, useNoteMutation } from '@/lib/queries'
import { type Deadline, type Paper, composeNudge } from '@papertrack/shared'
import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * The taped sticky note on the overview. Shows the owner's own reminder when one
 * is written (click to edit); otherwise an auto note — Claude-generated when an
 * OAuth token is configured, falling back to the deterministic `composeNudge`.
 */
export function DashboardNote({
  deadlines,
  papers,
}: {
  deadlines: Deadline[]
  papers: Paper[]
}) {
  const { data: note } = useNote()
  const save = useNoteMutation()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState('')
  const [sign, setSign] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const stored = note?.body.trim() ? { body: note.body, sign: note.sign } : null
  // Deterministic nudge renders instantly; the AI briefing (fetched only when
  // the owner hasn't written a note) upgrades it when available.
  const nudge = useMemo(() => composeNudge(deadlines, papers), [deadlines, papers])
  const { data: briefing } = useBriefing(!stored)
  const ai =
    briefing?.source === 'ai' && briefing.body.trim()
      ? { body: briefing.body, sign: briefing.sign }
      : null
  const shown = stored ?? ai ?? nudge
  const isAuto = !stored
  const isAI = isAuto && !!ai

  function openEditor() {
    setBody(stored?.body ?? '')
    setSign(stored?.sign ?? '')
    setEditing(true)
  }

  useEffect(() => {
    if (editing) bodyRef.current?.focus()
  }, [editing])

  function commit() {
    const next = { body: body.trim(), sign: sign.trim() }
    save.mutate(next, {
      onSuccess: () => {
        setEditing(false)
        toast.show(next.body ? 'Đã lưu ghi chú' : 'Đã xoá ghi chú — dùng gợi ý tự động')
      },
      onError: () => toast.show('Không lưu được ghi chú', 'danger'),
    })
  }

  if (editing) {
    return (
      <StickyNote className="w-full max-w-[212px]">
        <textarea
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          maxLength={280}
          rows={3}
          placeholder="Ghi chú…"
          className="w-full resize-none border-0 bg-transparent p-0 font-script text-[19px] font-semibold leading-[1.45] text-ink-note outline-none placeholder:not-italic placeholder:text-faint"
        />
        <div className="mt-1 flex items-baseline gap-1 text-seal">
          <span className="font-script text-[16px] font-semibold">—</span>
          <input
            value={sign}
            onChange={(e) => setSign(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') setEditing(false)
            }}
            maxLength={40}
            placeholder="Ký tên"
            className="w-full bg-transparent font-script text-[16px] font-semibold text-seal placeholder:font-serif placeholder:text-[13px] placeholder:italic placeholder:text-faint focus:outline-none"
          />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Hủy
          </Button>
          <Button size="sm" onClick={commit} disabled={save.isPending}>
            Lưu
          </Button>
        </div>
      </StickyNote>
    )
  }

  return (
    <StickyNote className="group w-full max-w-[212px]">
      <button
        type="button"
        onClick={openEditor}
        title="Sửa ghi chú"
        className="block w-full cursor-pointer text-left"
      >
        <div className="font-script text-[19px] font-semibold leading-[1.45] text-ink-note">
          {shown.body}
        </div>
        <div className="mt-1.5 text-right font-script text-[16px] font-semibold text-seal">
          — {shown.sign} ↘
        </div>
      </button>
      <div className="mt-1 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100 max-lg:opacity-100">
        {isAuto ? (
          <span className="font-serif text-[10.5px] italic text-faint">
            {isAI ? '✨ gợi ý AI' : 'tự động'}
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={openEditor}
          className="cursor-pointer font-serif text-[11px] italic text-muted transition-colors hover:text-seal max-sm:py-2 max-sm:pl-2"
        >
          ✎ ghi chú
        </button>
      </div>
    </StickyNote>
  )
}
