import type {
  ApcEntry,
  Attachment,
  Author,
  AuthorInput,
  Conference,
  ConferenceInput,
  Deadline,
  Journal,
  JournalInput,
  OverviewStats,
  Paper,
  PaperDraft,
  PaperInput,
  RewardCategory,
  RewardCategoryInput,
  Settlement,
  SpecialIssue,
  SpecialIssueInput,
} from '@papertrack/shared'

const BASE = '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  })
  if (res.status === 401) {
    onUnauthorized?.()
    throw new ApiError(401, 'Chưa đăng nhập')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body?.error ?? `Lỗi ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) })

// ─── Notifications payload ────────────────────────────────────────────────────
export interface PaperRef {
  id: number
  title: string
  venue: string
}
export interface NotificationsPayload {
  urgent: Deadline[]
  remind: {
    accepted: PaperRef[]
    soon: Deadline[]
    settle: { author: string; pend: number }[]
  }
  watch: (PaperRef & { days: number })[]
}

export interface PaperWithAttachments extends Paper {
  attachments: Attachment[]
}

export interface StoredNote {
  body: string
  sign: string
  updatedAt: string
}

/** The auto dashboard note: `ai` when Claude generated it, `fallback` when the
 *  deterministic nudge was used (no token, or generation failed). */
export interface Briefing {
  body: string
  sign: string
  source: 'ai' | 'fallback'
}

/** A paper draft resolved from a DOI (Crossref) or free text (Claude). */
export interface ExtractResult {
  draft: PaperDraft
  source: 'crossref' | 'ai' | 'none'
}

export interface RankSuggestion {
  rank: string
  confidence: 'cao' | 'vừa' | 'thấp'
  reason: string
}

/** One prior turn replayed to the model for follow-up context. */
export interface AskMessage {
  role: 'user' | 'assistant'
  content: string
}

/** A grounded answer over the ledger. `paperIds` are the papers the answer
 *  leans on (for the owner to open and verify). `enabled` is false when no AI
 *  token is configured; `error` is true when the model call failed. */
export interface AskResult {
  answer: string
  paperIds: number[]
  enabled: boolean
  error?: boolean
}

export interface Inventory {
  papers: number
  journals: number
  conferences: number
  specialIssues: number
  authors: number
  rewardCategories: number
}

function crud<T, I>(resource: string) {
  return {
    list: () => req<T[]>(`/${resource}`),
    get: (id: number) => req<T>(`/${resource}/${id}`),
    create: (data: I) => req<T>(`/${resource}`, { method: 'POST', ...json(data) }),
    update: (id: number, data: Partial<I>) =>
      req<T>(`/${resource}/${id}`, { method: 'PATCH', ...json(data) }),
    remove: (id: number) => req<{ ok: true }>(`/${resource}/${id}`, { method: 'DELETE' }),
  }
}

export const api = {
  auth: {
    me: () => req<{ authenticated: boolean }>('/auth/me'),
    login: (password: string) =>
      req<{ ok: true }>('/auth/login', { method: 'POST', ...json({ password }) }),
    logout: () => req<{ ok: true }>('/auth/logout', { method: 'POST' }),
  },

  papers: {
    list: () => req<Paper[]>('/papers'),
    get: (id: number) => req<PaperWithAttachments>(`/papers/${id}`),
    create: (data: PaperInput) => req<Paper>('/papers', { method: 'POST', ...json(data) }),
    update: (id: number, data: Partial<PaperInput>) =>
      req<Paper>(`/papers/${id}`, { method: 'PATCH', ...json(data) }),
    remove: (id: number) => req<{ ok: true }>(`/papers/${id}`, { method: 'DELETE' }),
    move: (
      id: number,
      body: { status: string; beforeId?: number | null; afterId?: number | null },
    ) => req<Paper>(`/papers/${id}/move`, { method: 'POST', ...json(body) }),
    advance: (id: number) => req<Paper>(`/papers/${id}/advance`, { method: 'POST' }),
    reject: (id: number) => req<Paper>(`/papers/${id}/reject`, { method: 'POST' }),
    restore: (id: number) => req<Paper>(`/papers/${id}/restore`, { method: 'POST' }),
    settlePay: (id: number, body: { author: string; amount: number; date?: string }) =>
      req<Paper>(`/papers/${id}/settle/pay`, { method: 'POST', ...json(body) }),
    settleReward: (id: number, received: boolean) =>
      req<Paper>(`/papers/${id}/settle/reward`, { method: 'POST', ...json({ received }) }),
    attachments: {
      list: (id: number) => req<Attachment[]>(`/papers/${id}/attachments`),
      upload: (id: number, file: File) => {
        const fd = new FormData()
        fd.append('file', file)
        return req<Attachment>(`/papers/${id}/attachments`, { method: 'POST', body: fd })
      },
    },
  },

  attachments: {
    downloadUrl: (id: number) => `${BASE}/attachments/${id}/download`,
    remove: (id: number) => req<{ ok: true }>(`/attachments/${id}`, { method: 'DELETE' }),
  },

  authors: crud<Author, AuthorInput>('authors'),
  journals: crud<Journal, JournalInput>('journals'),
  conferences: crud<Conference, ConferenceInput>('conferences'),
  specialIssues: crud<SpecialIssue, SpecialIssueInput>('special-issues'),
  rewardCategories: crud<RewardCategory, RewardCategoryInput>('reward-categories'),

  stats: {
    overview: () => req<{ stats: OverviewStats; deadlines: Deadline[] }>('/stats/overview'),
    settlement: () => req<Settlement>('/stats/settlement'),
    notifications: () => req<NotificationsPayload>('/stats/notifications'),
  },

  note: {
    get: () => req<StoredNote>('/note'),
    update: (data: { body: string; sign: string }) =>
      req<StoredNote>('/note', { method: 'PUT', ...json(data) }),
  },

  ai: {
    briefing: () => req<Briefing>('/ai/briefing'),
    status: () => req<{ enabled: boolean }>('/ai/status'),
    extractPaper: (source: string) =>
      req<ExtractResult>('/ai/extract-paper', { method: 'POST', ...json({ source }) }),
    suggestRank: (venue: string, doi?: string) =>
      req<{ suggestion: RankSuggestion | null }>('/ai/suggest-rank', {
        method: 'POST',
        ...json({ venue, doi }),
      }),
    ask: (question: string, history: AskMessage[] = []) =>
      req<AskResult>('/ai/ask', { method: 'POST', ...json({ question, history }) }),
  },

  data: {
    inventory: () => req<Inventory>('/data/inventory'),
    exportUrl: `${BASE}/data/export`,
    exportXlsxUrl: `${BASE}/data/export.xlsx`,
    import: (bundle: unknown) =>
      req<{ ok: true; counts: Inventory }>('/data/import', { method: 'POST', ...json(bundle) }),
    reset: () => req<{ ok: true; counts: Inventory }>('/data/reset', { method: 'POST' }),
    clear: () => req<{ ok: true }>('/data/clear', { method: 'DELETE' }),
  },
}

export type { ApcEntry }
