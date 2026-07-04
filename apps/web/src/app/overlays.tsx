import { AskDrawer } from '@/features/ask/AskDrawer'
import { PaperDrawer } from '@/features/papers/PaperDrawer'
import { PaperModal } from '@/features/papers/PaperModal'
import { type ReactNode, createContext, use, useMemo, useState } from 'react'

/**
 * Three overlays are global (opened from the masthead, kanban, ledger, drawer…):
 *  - the paper editor modal (create / edit)
 *  - the paper detail drawer
 *  - the "ask the ledger" modal
 * Everything else (catalog modals, catalog drawer) is local to its screen.
 */
interface OverlayApi {
  openCreatePaper: () => void
  openEditPaper: (id: number) => void
  /**
   * Open the paper detail drawer. Pass `onBack` when opening from inside another
   * drawer (e.g. an author's catalog detail): the paper detail then stacks with a
   * back button, and closing/going back runs `onBack` to return to that parent
   * instead of dismissing everything.
   */
  openPaperDetail: (id: number, opts?: { onBack?: () => void }) => void
  /** Open the natural-language "Hỏi sổ" question modal. */
  openAsk: () => void
  closeAll: () => void
}

const OverlayContext = createContext<OverlayApi | null>(null)

export function useOverlays(): OverlayApi {
  const ctx = use(OverlayContext)
  if (!ctx) throw new Error('useOverlays must be used within <OverlayProvider>')
  return ctx
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [editId, setEditId] = useState<number | 'new' | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [askOpen, setAskOpen] = useState(false)
  // When the detail drawer was stacked over a parent, this reopens that parent.
  const [detailBack, setDetailBack] = useState<(() => void) | null>(null)

  const api = useMemo<OverlayApi>(
    () => ({
      openCreatePaper: () => setEditId('new'),
      openEditPaper: (id) => setEditId(id),
      openPaperDetail: (id, opts) => {
        setDetailId(id)
        // Wrap so useState treats the callback as a value, not an updater.
        setDetailBack(() => opts?.onBack ?? null)
      },
      openAsk: () => setAskOpen(true),
      closeAll: () => {
        setEditId(null)
        setDetailId(null)
        setDetailBack(null)
        setAskOpen(false)
      },
    }),
    [],
  )

  // Close the paper detail; if it was stacked over a parent, return to that
  // parent rather than dismissing everything.
  const closeDetail = () => {
    const back = detailBack
    setDetailId(null)
    setDetailBack(null)
    back?.()
  }

  return (
    <OverlayContext value={api}>
      {children}
      {/* Ask drawer sits below the paper detail drawer so a cited paper opened
          from a conversation stacks on top of it. */}
      <AskDrawer open={askOpen} onClose={() => setAskOpen(false)} />
      <PaperDrawer
        paperId={detailId}
        onBack={detailBack ? closeDetail : undefined}
        onClose={closeDetail}
        onEdit={(id) => {
          setDetailId(null)
          setDetailBack(null)
          setEditId(id)
        }}
      />
      <PaperModal
        editId={editId}
        onClose={() => setEditId(null)}
        onSaved={(id) => {
          setEditId(null)
          if (id) setDetailId(id)
        }}
      />
    </OverlayContext>
  )
}
