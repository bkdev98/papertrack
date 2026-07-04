import Anthropic from '@anthropic-ai/sdk'
import type { DashboardNote, PaperDraft } from '@papertrack/shared'
import { env, useAI } from '../env'

/**
 * Claude-backed helpers for PaperTrack. Every one sits at an *edge* — phrasing
 * computed signals (output) or turning unstructured input into a draft the owner
 * confirms (input) — never in the ledger math. All return null when no OAuth
 * token is configured or on any error, so callers fall back cleanly.
 *
 * Auth is a personal Claude Code OAuth token (bearer + oauth beta header), not a
 * metered API key — so every request carries the Claude Code system identity.
 *
 * PaperTrack is a single-owner ledger, not a team tool: copy addresses the owner,
 * never "nhắc nhóm".
 */

// Claude Code OAuth (subscription) tokens are only authorised for requests that
// identify as Claude Code — this is an auth requirement of the token, NOT the
// assistant's persona, and must remain exactly this string as the first system
// block. The product identity the owner actually sees is PRODUCT_IDENTITY below.
const CLAUDE_CODE_IDENTITY = "You are Claude Code, Anthropic's official CLI for Claude."

// The identity the assistant presents to the ledger's owner. Layered on top of
// the auth block above so PaperTrack is what the owner sees, not the platform.
const PRODUCT_IDENTITY =
  'You are PaperTrack, a research-ledger assistant developed by Quoc Khanh at Vrex Studio. When asked who you are or who made you, identify yourself as PaperTrack, developed by Quoc Khanh at Vrex Studio. Do not describe yourself as Claude Code.'

let client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!useAI) return null
  if (!client) {
    client = new Anthropic({
      // OAuth bearer token, not an x-api-key. apiKey: null stops the SDK from
      // also picking up ANTHROPIC_API_KEY from the env (sending both → 401).
      apiKey: null,
      authToken: env.CLAUDE_CODE_OAUTH_TOKEN,
      defaultHeaders: { 'anthropic-beta': 'oauth-2025-04-20' },
    })
  }
  return client
}

/** Keep only the clean prefix of a model string field. The Claude Code OAuth
 *  token can emit XML-style tool arguments whose delimiters leak into native
 *  tool_use fields; cut at the first such fragment so garbage never reaches the
 *  form (an over-cut just leaves a field empty for the owner to fill). */
function sanitize(s: string | undefined): string {
  return (s ?? '').split(/<\/?(?:antml|parameter|function)\b/i)[0]?.trim() ?? ''
}

interface ToolDef {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
    additionalProperties: false
  }
}

/** Force one strict tool call and return its validated input, or null on error. */
async function callTool<T>(opts: {
  system: string
  user: string
  tool: ToolDef
  maxTokens?: number
}): Promise<T | null> {
  const anthropic = getClient()
  if (!anthropic) return null
  try {
    const res = await anthropic.messages.create({
      model: env.AI_MODEL,
      max_tokens: opts.maxTokens ?? 512,
      system: [
        { type: 'text', text: CLAUDE_CODE_IDENTITY },
        { type: 'text', text: PRODUCT_IDENTITY },
        { type: 'text', text: opts.system },
      ],
      tools: [{ ...opts.tool, strict: true }],
      tool_choice: { type: 'tool', name: opts.tool.name },
      messages: [{ role: 'user', content: opts.user }],
    })
    const call = res.content.find((b) => b.type === 'tool_use')
    return (call?.input as T) ?? null
  } catch (err) {
    console.error(`AI ${opts.tool.name} failed:`, err)
    return null
  }
}

// ─── Dashboard briefing (output edge) ────────────────────────────────────────

/** Only publication-metadata + counts reach the model. No author names, emails,
 *  bank details, DOIs, or settlement figures — those never leave the ledger. */
export interface BriefingSignals {
  today: string
  totals: {
    total: number
    published: number
    q12: number
    inproc: number
    finished: number
    rejected: number
  }
  urgentDeadlines: { name: string; days: number }[]
  soonDeadlines: { name: string; days: number }[]
  acceptedAwaiting: number
  longReview: { title: string; venue: string; days: number }[]
  unpaidApc: { count: number; amount: number }
}

const BRIEFING_SYSTEM = `You are the archivist of PaperTrack — a hand-kept ledger that ONE researcher uses to track their scientific-publication work at a Vietnamese university IT faculty (IUH · CNTT).

Write ONE short reminder note, in Vietnamese, for the ledger's single owner. Then emit it via the emit_note tool.

Rules:
- This is a personal ledger, NOT a team tool. Address the owner directly or write a neutral to-do. NEVER use team language ("nhắc nhóm", "cả nhóm", "team").
- Keep "body" to at most ~160 characters — it lands on a tiny paper sticky note. One sentence, warm but concise, in the register of an archival accounting book.
- Prioritise the single most pressing thing, in this order: an urgent deadline (≤15 days) → papers accepted awaiting camera-ready & reward filing → a deadline coming soon (≤30 days) → papers stuck long in review → unpaid fees → otherwise a calm "clean ledger" note that keeps up research momentum.
- Use ONLY facts present in the provided signals JSON. Never invent a paper, venue, number, or date. Reference venue/issue names and counts; you may shorten a long venue name.
- "sign" is a short Vietnamese signature for the ledger, e.g. "Thư ký sổ" or "PaperTrack".`

/** Generate the note from signals, or null to fall back to the deterministic nudge. */
export async function generateBriefingNote(
  signals: BriefingSignals,
): Promise<DashboardNote | null> {
  const out = await callTool<{ body?: string; sign?: string }>({
    system: BRIEFING_SYSTEM,
    user: JSON.stringify(signals),
    maxTokens: 300,
    tool: {
      name: 'emit_note',
      description: 'Emit the finished sticky-note reminder for the ledger owner.',
      input_schema: {
        type: 'object',
        properties: {
          body: { type: 'string', description: 'The Vietnamese reminder (≤160 chars).' },
          sign: { type: 'string', description: 'Short Vietnamese signature.' },
        },
        required: ['body', 'sign'],
        additionalProperties: false,
      },
    },
  })
  const body = sanitize(out?.body)
  if (!body) return null
  return { body: body.slice(0, 280), sign: (sanitize(out?.sign) || 'PaperTrack').slice(0, 40) }
}

// ─── Paper autofill (input edge) ─────────────────────────────────────────────

const EXTRACT_SYSTEM = `You extract structured bibliographic metadata for PaperTrack, a scientific-publication ledger, from a free-text reference the owner pasted (a citation, an acceptance email, an abstract header, etc.).

Emit the fields via the draft_paper tool. Rules:
- Use ONLY what is present in the text. Do NOT invent, complete, or look up anything. Leave a field an empty string / empty list when the text doesn't contain it.
- "title" is the paper title; "venue" is the journal or conference name (not the publisher).
- "type": "Hội thảo" for a conference/proceedings paper, otherwise "Tạp chí".
- "date": ISO YYYY-MM-DD if a full date is present; otherwise leave empty (do not guess a month/day).
- "authors": each author's full name as written, in order.
- "doi": the bare DOI (e.g. 10.1234/abcd) if present, else empty.
- "rank": only if the text explicitly states an index/quartile (e.g. "SCIE Q1", "Scopus"); never infer it from the venue's reputation.`

/** Extract a paper draft from a free-text reference, or null. */
export async function extractPaperFromText(text: string): Promise<PaperDraft | null> {
  const out = await callTool<{
    title: string
    type: string
    venue: string
    rank: string
    date: string
    doi: string
    authors: string[]
  }>({
    system: EXTRACT_SYSTEM,
    user: text.slice(0, 6000),
    maxTokens: 700,
    tool: {
      name: 'draft_paper',
      description: 'Emit the bibliographic fields extracted from the reference.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          type: { type: 'string', enum: ['Tạp chí', 'Hội thảo'] },
          venue: { type: 'string' },
          rank: { type: 'string' },
          date: { type: 'string', description: 'ISO YYYY-MM-DD or empty' },
          doi: { type: 'string' },
          authors: { type: 'array', items: { type: 'string' } },
        },
        required: ['title', 'type', 'venue', 'rank', 'date', 'doi', 'authors'],
        additionalProperties: false,
      },
    },
  })
  if (!out) return null
  const draft: PaperDraft = {
    title: sanitize(out.title) || undefined,
    type: out.type === 'Hội thảo' ? 'Hội thảo' : 'Tạp chí',
    venue: sanitize(out.venue) || undefined,
    rank: sanitize(out.rank) || undefined,
    date: sanitize(out.date) || undefined,
    doi: sanitize(out.doi) || undefined,
    authors: (out.authors ?? []).map(sanitize).filter(Boolean),
  }
  // A draft with nothing but the default type is not worth returning.
  return draft.title || draft.venue || draft.authors?.length ? draft : null
}

// ─── Rank suggestion (input edge, explicitly a guess) ────────────────────────

export interface RankSuggestion {
  rank: string
  confidence: 'cao' | 'vừa' | 'thấp'
  reason: string
}

/** Suggest a rank/index for a venue, constrained to the ledger's own vocabulary.
 *  Explicitly a guess the owner must confirm — returns '' rank when unsure. */
export async function suggestRank(
  venue: string,
  vocab: string[],
  doi?: string,
): Promise<RankSuggestion | null> {
  const out = await callTool<RankSuggestion>({
    system: `You suggest the likely index/quartile category for an academic venue, for a Vietnamese publication ledger. This is only a hint the owner will verify — accuracy matters more than coverage.

- "rank" MUST be one of the ledger's own categories provided in the input, or "" if you are not reasonably sure.
- Base it on the venue's generally-known standing. Do NOT fabricate a specific quartile you are unsure of — prefer "" over a confident wrong guess.
- "confidence": "cao" (high), "vừa" (medium), or "thấp" (low).
- "reason": one short Vietnamese clause explaining the basis.`,
    user: JSON.stringify({ venue, doi: doi ?? '', categories: vocab }),
    maxTokens: 300,
    tool: {
      name: 'suggest_rank',
      description: 'Emit a rank suggestion drawn only from the provided categories.',
      input_schema: {
        type: 'object',
        properties: {
          rank: { type: 'string', enum: [...vocab, ''] },
          confidence: { type: 'string', enum: ['cao', 'vừa', 'thấp'] },
          reason: { type: 'string' },
        },
        required: ['rank', 'confidence', 'reason'],
        additionalProperties: false,
      },
    },
  })
  if (!out) return null
  return { rank: sanitize(out.rank), confidence: out.confidence, reason: sanitize(out.reason) }
}

// ─── Ask the ledger (output edge, grounded Q&A) ──────────────────────────────

const ASK_SYSTEM = `You are the archivist of PaperTrack — a single researcher's hand-kept scientific-publication ledger (Vietnamese, IUH · CNTT). Answer the owner's questions about their ledger, in Vietnamese, across a running conversation.

A JSON snapshot of the ledger — pre-computed aggregates (overview, settlement, deadlines) and a compact table of every paper — is provided in the system prompt. Rules:
- Answer ONLY from the snapshot. If something isn't in it, say so plainly ("Sổ chưa có dữ liệu để trả lời câu này.").
- For figures already in the aggregates (reward, spend, counts, unpaid, settlement), quote them as given — do NOT recompute. Prefer the pre-formatted *Text fields when present.
- For filter/lookup questions, scan the papers table and NAME the specific papers ("title — venue") you count or list, so the owner can verify. Don't invent papers or numbers.
- Use earlier turns for context on follow-ups ("còn năm ngoái?", "bài nào trong số đó…"), but always ground the facts in the snapshot as it stands now.
- This is a personal ledger: address the owner or state facts neutrally; never use team language ("nhóm").
- Be concise and direct. Money is đồng. You may use light Markdown (**bold**, "-" bullet lists, numbered lists).
- If specific papers are central to the answer, end with ONE final line exactly like "REF: 12, 45" listing their id numbers from the table. Omit that line otherwise.`

/** One prior turn of the ask conversation, replayed for follow-up context. */
export interface AskMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Answer a natural-language question grounded in a pre-computed ledger snapshot,
 *  within a running conversation. Plain text (no tools) — the deterministic
 *  figures are already in the snapshot; the model only reads and phrases.
 *  Returns null on no token / error. */
export async function askLedger(
  question: string,
  snapshot: unknown,
  history: AskMessage[] = [],
): Promise<string | null> {
  const anthropic = getClient()
  if (!anthropic) return null
  try {
    const res = await anthropic.messages.create({
      model: env.AI_MODEL,
      max_tokens: 900,
      system: [
        { type: 'text', text: CLAUDE_CODE_IDENTITY },
        { type: 'text', text: PRODUCT_IDENTITY },
        { type: 'text', text: ASK_SYSTEM },
        { type: 'text', text: `Ledger snapshot (JSON):\n${JSON.stringify(snapshot)}` },
      ],
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: question },
      ],
    })
    let text = ''
    for (const b of res.content) if (b.type === 'text') text += b.text
    return text.trim() || null
  } catch (err) {
    console.error('AI ask failed:', err)
    return null
  }
}
