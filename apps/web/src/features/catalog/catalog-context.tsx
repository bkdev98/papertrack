import type { CatalogKind } from '@/app/nav'
import { type ReactNode, createContext, use, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CatalogDrawer } from './CatalogDrawer'
import { CatalogModal } from './CatalogModal'

/** Modal is either a blank "add" form or an "edit" form seeded from a record. */
export type CatalogModalState =
  | { mode: 'create' }
  | { mode: 'edit'; id: number; values: Record<string, string> }

interface CatalogApi {
  kind: CatalogKind
  /** Open the detail drawer for a record. */
  openDetail: (id: number) => void
  /** Open the blank add-to-catalog modal. */
  openCreate: () => void
}

const CatalogContext = createContext<CatalogApi | null>(null)

export function useCatalog(): CatalogApi {
  const ctx = use(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within <CatalogProvider>')
  return ctx
}

/**
 * Holds the per-screen catalog overlays (detail drawer + add/edit modal) and
 * exposes open handlers to the sub-screens. Keyed by kind in CatalogScreen so
 * switching sub-nav resets any open overlay.
 */
export function CatalogProvider({ kind, children }: { kind: CatalogKind; children: ReactNode }) {
  const [detailId, setDetailId] = useState<number | null>(null)
  const [modal, setModal] = useState<CatalogModalState | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Deep-link: `?open=<id>` (e.g. from a finance author chip) opens that record's
  // drawer, then strips the param so a refresh/back doesn't reopen it.
  useEffect(() => {
    const open = searchParams.get('open')
    if (open && /^\d+$/.test(open)) {
      setDetailId(Number(open))
      const next = new URLSearchParams(searchParams)
      next.delete('open')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const api = useMemo<CatalogApi>(
    () => ({
      kind,
      openDetail: (id) => setDetailId(id),
      openCreate: () => setModal({ mode: 'create' }),
    }),
    [kind],
  )

  return (
    <CatalogContext value={api}>
      {children}
      <CatalogDrawer
        kind={kind}
        recordId={detailId}
        onClose={() => setDetailId(null)}
        onReopen={(id) => setDetailId(id)}
        onEdit={(id, values) => setModal({ mode: 'edit', id, values })}
      />
      <CatalogModal kind={kind} state={modal} onClose={() => setModal(null)} />
    </CatalogContext>
  )
}
