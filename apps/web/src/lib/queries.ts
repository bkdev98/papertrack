import type { PaperInput } from '@papertrack/shared'
import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type AskMessage, api } from './api'

export const qk = {
  auth: ['auth', 'me'] as const,
  papers: ['papers'] as const,
  paper: (id: number) => ['papers', id] as const,
  overview: ['stats', 'overview'] as const,
  settlement: ['stats', 'settlement'] as const,
  notifications: ['stats', 'notifications'] as const,
  note: ['note'] as const,
  briefing: ['ai', 'briefing'] as const,
  aiStatus: ['ai', 'status'] as const,
  inventory: ['data', 'inventory'] as const,
  authors: ['authors'] as const,
  journals: ['journals'] as const,
  conferences: ['conferences'] as const,
  specialIssues: ['special-issues'] as const,
  rewardCategories: ['reward-categories'] as const,
}

/** Everything derived from papers changes when a paper changes. */
function invalidatePaperDerived(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: qk.papers })
  qc.invalidateQueries({ queryKey: qk.overview })
  qc.invalidateQueries({ queryKey: qk.settlement })
  qc.invalidateQueries({ queryKey: qk.notifications })
  qc.invalidateQueries({ queryKey: qk.inventory })
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const useAuthMe = () =>
  useQuery({ queryKey: qk.auth, queryFn: api.auth.me, staleTime: 60_000, retry: false })

// ─── Reads ────────────────────────────────────────────────────────────────────
export const usePapers = () => useQuery({ queryKey: qk.papers, queryFn: api.papers.list })
export const usePaper = (id: number | null) =>
  useQuery({
    queryKey: id ? qk.paper(id) : ['papers', 'none'],
    queryFn: () => api.papers.get(id as number),
    enabled: id != null,
  })
export const useOverview = () => useQuery({ queryKey: qk.overview, queryFn: api.stats.overview })
export const useSettlement = () =>
  useQuery({ queryKey: qk.settlement, queryFn: api.stats.settlement })
export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: api.stats.notifications })
export const useInventory = () => useQuery({ queryKey: qk.inventory, queryFn: api.data.inventory })
export const useNote = () => useQuery({ queryKey: qk.note, queryFn: api.note.get })

/** The auto dashboard note (Claude-generated when a token is set, else the
 *  deterministic nudge). Only fetched when the owner hasn't written their own. */
export const useBriefing = (enabled: boolean) =>
  useQuery({
    queryKey: qk.briefing,
    queryFn: api.ai.briefing,
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
  })

/** Whether AI generation is available (a token is configured). Constant per
 *  session — free-text autofill and rank suggestion need it; the DOI path doesn't. */
export const useAiStatus = () =>
  useQuery({
    queryKey: qk.aiStatus,
    queryFn: api.ai.status,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

/** Ask a natural-language question over the ledger, with prior turns for
 *  follow-up context. Read-only (grounded in a computed snapshot), so it
 *  invalidates nothing. */
export const useAskLedger = () =>
  useMutation({
    mutationFn: (v: { question: string; history: AskMessage[] }) =>
      api.ai.ask(v.question, v.history),
  })

/** Persist the dashboard sticky note; primes the cache with the saved row. */
export function useNoteMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { body: string; sign: string }) => api.note.update(data),
    onSuccess: (row) => qc.setQueryData(qk.note, row),
  })
}

export const useAuthors = () => useQuery({ queryKey: qk.authors, queryFn: api.authors.list })
export const useJournals = () => useQuery({ queryKey: qk.journals, queryFn: api.journals.list })
export const useConferences = () =>
  useQuery({ queryKey: qk.conferences, queryFn: api.conferences.list })
export const useSpecialIssues = () =>
  useQuery({ queryKey: qk.specialIssues, queryFn: api.specialIssues.list })
export const useRewardCategories = () =>
  useQuery({ queryKey: qk.rewardCategories, queryFn: api.rewardCategories.list })

// ─── Paper mutations ───────────────────────────────────────────────────────────
export function usePaperMutations() {
  const qc = useQueryClient()
  const done = () => invalidatePaperDerived(qc)

  return {
    create: useMutation({
      mutationFn: (data: PaperInput) => api.papers.create(data),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: Partial<PaperInput> }) =>
        api.papers.update(id, data),
      onSuccess: (_r, v) => {
        done()
        qc.invalidateQueries({ queryKey: qk.paper(v.id) })
      },
    }),
    remove: useMutation({ mutationFn: (id: number) => api.papers.remove(id), onSuccess: done }),
    advance: useMutation({ mutationFn: (id: number) => api.papers.advance(id), onSuccess: done }),
    reject: useMutation({ mutationFn: (id: number) => api.papers.reject(id), onSuccess: done }),
    restore: useMutation({ mutationFn: (id: number) => api.papers.restore(id), onSuccess: done }),
    settlePay: useMutation({
      mutationFn: (v: { id: number; author: string; amount: number; date?: string }) =>
        api.papers.settlePay(v.id, v),
      onSuccess: done,
    }),
    settleReward: useMutation({
      mutationFn: (v: { id: number; received: boolean }) =>
        api.papers.settleReward(v.id, v.received),
      onSuccess: done,
    }),
  }
}

/** Optimistic kanban move — patches the papers cache immediately, reconciles on settle. */
export function useMovePaper() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      id: number
      status: string
      beforeId?: number | null
      afterId?: number | null
    }) => api.papers.move(v.id, v),
    onSettled: () => invalidatePaperDerived(qc),
  })
}

// ─── Attachments ────────────────────────────────────────────────────────────────
export function useAttachmentMutations(paperId: number) {
  const qc = useQueryClient()
  const done = () => qc.invalidateQueries({ queryKey: qk.paper(paperId) })
  return {
    upload: useMutation({
      mutationFn: (file: File) => api.papers.attachments.upload(paperId, file),
      onSuccess: done,
    }),
    remove: useMutation({
      mutationFn: (id: number) => api.attachments.remove(id),
      onSuccess: done,
    }),
  }
}

// ─── Catalog mutations (generic) ─────────────────────────────────────────────────
type CatalogKind = 'authors' | 'journals' | 'conferences' | 'specialIssues' | 'rewardCategories'
const catalogKey: Record<CatalogKind, readonly string[]> = {
  authors: qk.authors,
  journals: qk.journals,
  conferences: qk.conferences,
  specialIssues: qk.specialIssues,
  rewardCategories: qk.rewardCategories,
}

interface CrudApi {
  create: (data: any) => Promise<any>
  update: (id: number, data: any) => Promise<any>
  remove: (id: number) => Promise<any>
}

export function useCatalogMutations(kind: CatalogKind) {
  const qc = useQueryClient()
  const resource = api[kind] as CrudApi
  const done = () => {
    qc.invalidateQueries({ queryKey: catalogKey[kind] })
    invalidatePaperDerived(qc)
  }
  return {
    create: useMutation({ mutationFn: (data: any) => resource.create(data), onSuccess: done }),
    update: useMutation({
      mutationFn: ({ id, data }: { id: number; data: any }) => resource.update(id, data),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: (id: number) => resource.remove(id), onSuccess: done }),
  }
}

// ─── Data ops ─────────────────────────────────────────────────────────────────
export function useDataMutations() {
  const qc = useQueryClient()
  const done = () => qc.invalidateQueries()
  return {
    import: useMutation({
      mutationFn: (bundle: unknown) => api.data.import(bundle),
      onSuccess: done,
    }),
    reset: useMutation({ mutationFn: () => api.data.reset(), onSuccess: done }),
    clear: useMutation({ mutationFn: () => api.data.clear(), onSuccess: done }),
  }
}
