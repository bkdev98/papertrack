import type { PaperDraft } from '@papertrack/shared'

/**
 * Resolve a DOI to authoritative publication metadata via Crossref. This is the
 * deterministic half of paper autofill — facts come from Crossref, never from
 * the model — so it works with no API token at all. Returns null on any failure
 * so the caller can fall back to AI text extraction or an empty draft.
 */

const DOI_RE = /10\.\d{4,9}\/[^\s"<>]+/i

/** Pull the first DOI out of a string (a bare DOI, a doi.org URL, or prose). */
export function extractDoi(input: string): string | null {
  const m = input.match(DOI_RE)
  // Trim trailing punctuation a DOI can't end with (from pasted prose/URLs).
  return m ? m[0].replace(/[.,;)\]]+$/, '') : null
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Crossref date-parts ([[y], [y,m], or [y,m,d]]) → best-effort ISO YYYY-MM-DD. */
function isoDate(parts?: number[][]): string {
  const p = parts?.[0]
  if (!p?.[0]) return ''
  return `${p[0]}-${pad(p[1] ?? 1)}-${pad(p[2] ?? 1)}`
}

function authorName(a: { given?: string; family?: string; name?: string }): string {
  if (a.name) return a.name.trim()
  return [a.given, a.family].filter(Boolean).join(' ').trim()
}

interface CrossrefMessage {
  title?: string[]
  'container-title'?: string[]
  author?: { given?: string; family?: string; name?: string }[]
  type?: string
  DOI?: string
  URL?: string
  event?: { name?: string }
  published?: { 'date-parts'?: number[][] }
  'published-online'?: { 'date-parts'?: number[][] }
  'published-print'?: { 'date-parts'?: number[][] }
  issued?: { 'date-parts'?: number[][] }
}

export async function fetchCrossref(doi: string, timeoutMs = 8000): Promise<PaperDraft | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'PaperTrack/1.0 (internal publication ledger)' },
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const body = (await res.json()) as { message?: CrossrefMessage }
    const m = body.message
    if (!m) return null

    const venue = m['container-title']?.[0] ?? m.event?.name ?? ''
    const t = (m.type ?? '').toLowerCase()
    const type = t.includes('proceedings') ? 'Hội thảo' : 'Tạp chí'
    const date =
      isoDate(m.published?.['date-parts']) ||
      isoDate(m['published-online']?.['date-parts']) ||
      isoDate(m['published-print']?.['date-parts']) ||
      isoDate(m.issued?.['date-parts'])

    return {
      title: m.title?.[0]?.trim() || undefined,
      type,
      venue: venue || undefined,
      date: date || undefined,
      doi: m.DOI ?? doi,
      link: m.URL || `https://doi.org/${m.DOI ?? doi}`,
      authors: (m.author ?? []).map(authorName).filter(Boolean),
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
