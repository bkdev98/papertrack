import { cn } from '@/lib/utils'
import { type ReactNode, useMemo } from 'react'

/**
 * A tiny markdown renderer for the subset Claude emits in ledger answers —
 * headings, paragraphs, **bold**, *italic*, `code`, and ordered/bulleted lists.
 * Rendered into styled React nodes (never raw HTML) so it stays in the archival
 * register and can't inject markup. Anything richer degrades to plain text.
 */

type Block =
  | { kind: 'h'; text: string }
  | { kind: 'p'; lines: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'ul'; items: string[] }

const HEADING = /^#{1,6}\s+(.*)$/
const ORDERED = /^\s*\d+[.)]\s+(.*)$/
const BULLET = /^\s*[-*•]\s+(.*)$/

function parseBlocks(src: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: 'p', lines: para })
      para = []
    }
  }

  for (const raw of src.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) {
      flushPara()
      continue
    }
    const heading = line.match(HEADING)
    const ol = line.match(ORDERED)
    const ul = line.match(BULLET)
    if (heading) {
      flushPara()
      blocks.push({ kind: 'h', text: heading[1] })
    } else if (ol) {
      flushPara()
      const last = blocks[blocks.length - 1]
      if (last?.kind === 'ol') last.items.push(ol[1])
      else blocks.push({ kind: 'ol', items: [ol[1]] })
    } else if (ul) {
      flushPara()
      const last = blocks[blocks.length - 1]
      if (last?.kind === 'ul') last.items.push(ul[1])
      else blocks.push({ kind: 'ul', items: [ul[1]] })
    } else {
      para.push(line)
    }
  }
  flushPara()
  return blocks
}

const INLINE = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*\n]+)\*|_([^_\n]+)_)/g

/** Bold / italic / inline-code within one run of text. */
function renderInline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let i = 0
  INLINE.lastIndex = 0
  let m = INLINE.exec(text)
  while (m) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[2] != null) {
      out.push(
        <strong key={`${key}-${i}`} className="font-semibold text-ink">
          {m[2]}
        </strong>,
      )
    } else if (m[3] != null) {
      out.push(
        <code
          key={`${key}-${i}`}
          className="rounded-[2px] border border-rule bg-paper-chip px-[4px] py-[0.5px] font-mono text-[0.82em] text-ink-rank"
        >
          {m[3]}
        </code>,
      )
    } else {
      out.push(
        <em key={`${key}-${i}`} className="italic">
          {m[4] ?? m[5]}
        </em>,
      )
    }
    last = m.index + m[0].length
    i += 1
    m = INLINE.exec(text)
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text])
  return (
    <div className={cn('space-y-2.5 text-[13.5px] leading-[1.66] text-ink', className)}>
      {blocks.map((b, bi) => {
        if (b.kind === 'h') {
          return (
            <div
              key={`h-${bi}`}
              className="pt-0.5 font-serif text-[14.5px] font-semibold leading-snug text-ink"
            >
              {renderInline(b.text, `h-${bi}`)}
            </div>
          )
        }
        if (b.kind === 'p') {
          return (
            <p key={`p-${bi}`}>
              {b.lines.map((ln, li) => (
                <span key={`${bi}-${li}`}>
                  {li > 0 && <br />}
                  {renderInline(ln, `${bi}-${li}`)}
                </span>
              ))}
            </p>
          )
        }
        const ordered = b.kind === 'ol'
        return (
          <ul key={`list-${bi}`} className="space-y-1.5">
            {b.items.map((it, ii) => (
              <li key={`${bi}-${ii}`} className="flex gap-2.5">
                <span
                  className={cn(
                    'shrink-0 font-mono text-seal',
                    ordered ? 'mt-[0.5px] text-[11px] tabular-nums' : 'text-[13px] leading-[1.5]',
                  )}
                >
                  {ordered ? `${ii + 1}.` : '·'}
                </span>
                <span>{renderInline(it, `${bi}-${ii}`)}</span>
              </li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}
