import { useOverlays } from '@/app/overlays'
import { useToast } from '@/components/ui'
import { qk, useMovePaper, usePaperMutations } from '@/lib/queries'
import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  closestCorners,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  type GroupKey,
  KANBAN_COLUMNS,
  type Paper,
  STATUS_META,
  type Status,
} from '@papertrack/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PaperCard } from './PaperCard'

type ColumnMap = Record<string, number[]>

/** Group filtered papers into ordered id-lists per column (position asc, id asc). */
function buildColumns(papers: Paper[], columns: readonly Status[]): ColumnMap {
  const map: ColumnMap = {}
  for (const s of columns) map[s] = []
  const ordered = [...papers].sort((a, b) => a.position - b.position || a.id - b.id)
  for (const p of ordered) {
    const arr = map[p.status]
    if (arr) arr.push(p.id)
  }
  return map
}

// ─── Sortable card wrapper ──────────────────────────────────────────────────────
function SortableCard({
  paper,
  onOpen,
  onAdvance,
}: {
  paper: Paper
  onOpen: () => void
  onAdvance: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: paper.id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
    >
      <PaperCard paper={paper} onOpen={onOpen} onAdvance={onAdvance} dragging={isDragging} />
    </div>
  )
}

// ─── Column ─────────────────────────────────────────────────────────────────────
function Column({
  status,
  ids,
  byId,
  onOpen,
  onAdvance,
}: {
  status: Status
  ids: number[]
  byId: Map<number, Paper>
  onOpen: (id: number) => void
  onAdvance: (id: number) => void
}) {
  const meta = STATUS_META[status]
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <div className="flex min-w-0 flex-col">
      <div className="pb-1.5">
        <div className="flex items-baseline gap-1.5">
          <span
            className="font-mono text-[9.5px] uppercase tracking-[1.2px]"
            style={{ color: meta.color }}
          >
            {meta.short}
          </span>
          <span className="font-mono text-[10px] text-muted">· {ids.length}</span>
        </div>
        <div className="mt-1 h-[1.5px]" style={{ background: meta.color }} />
        <div className="mt-[1px] h-px opacity-40" style={{ background: meta.color }} />
      </div>

      <div ref={setNodeRef} className={cnBox(isOver)}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {ids.length === 0 ? (
            <div className="flex items-center justify-center rounded-[3px] border border-dashed border-rule-2 py-8 font-serif text-[12px] italic text-faint">
              — trống —
            </div>
          ) : (
            ids.map((id) => {
              const p = byId.get(id)
              if (!p) return null
              return (
                <SortableCard
                  key={id}
                  paper={p}
                  onOpen={() => onOpen(id)}
                  onAdvance={() => onAdvance(id)}
                />
              )
            })
          )}
        </SortableContext>
      </div>
    </div>
  )
}

function cnBox(isOver: boolean): string {
  return `flex min-h-[80px] flex-1 flex-col gap-2.5 rounded-[3px] p-1 transition-colors ${
    isOver ? 'bg-[rgba(163,56,43,0.05)]' : ''
  }`
}

// ─── Board ──────────────────────────────────────────────────────────────────────
export function KanbanBoard({ papers, group }: { papers: Paper[]; group: GroupKey }) {
  const columns = KANBAN_COLUMNS[group]
  const { openPaperDetail } = useOverlays()
  const { advance } = usePaperMutations()
  const move = useMovePaper()
  const qc = useQueryClient()
  const toast = useToast()

  const byId = useMemo(() => new Map(papers.map((p) => [p.id, p])), [papers])
  const [items, setItems] = useState<ColumnMap>(() => buildColumns(papers, columns))
  const [activeId, setActiveId] = useState<number | null>(null)
  const startRef = useRef<{ status: string; before: number | null; after: number | null } | null>(
    null,
  )

  // Re-sync from the (authoritative / optimistically-patched) query cache when idle.
  useEffect(() => {
    if (activeId == null) setItems(buildColumns(papers, columns))
  }, [papers, columns, activeId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Pointer-first collision so an *empty* column (its droppable box, with no
  // cards to collide against) is still detected when the cursor is inside it.
  // When over a non-empty column, narrow to the closest card so within-column
  // ordering keeps working.
  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const hits = pointerWithin(args)
      const primary = hits.length > 0 ? hits : rectIntersection(args)
      let overId = getFirstCollision(primary, 'id')
      if (overId == null) return closestCorners(args)
      if (typeof overId === 'string' && overId in items) {
        const inCol = items[overId] ?? []
        if (inCol.length > 0) {
          const inner = closestCorners({
            ...args,
            droppableContainers: args.droppableContainers.filter(
              (c) => typeof c.id === 'number' && inCol.includes(c.id),
            ),
          })
          overId = getFirstCollision(inner, 'id') ?? overId
        }
      }
      return [{ id: overId }]
    },
    [items],
  )

  function containerOf(id: UniqueIdentifier | undefined): string | undefined {
    if (id == null) return undefined
    if (typeof id === 'string' && id in items) return id
    const nid = Number(id)
    return columns.find((c) => items[c]?.includes(nid))
  }

  function neighbors(col: number[], k: number): { before: number | null; after: number | null } {
    return {
      before: k > 0 ? (col[k - 1] ?? null) : null,
      after: k >= 0 && k < col.length - 1 ? (col[k + 1] ?? null) : null,
    }
  }

  function onDragStart(e: DragStartEvent) {
    const id = Number(e.active.id)
    setActiveId(id)
    const c = containerOf(id)
    const arr = c ? items[c] : undefined
    if (c && arr) startRef.current = { status: c, ...neighbors(arr, arr.indexOf(id)) }
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const from = containerOf(active.id)
    const to = containerOf(over.id)
    if (!from || !to || from === to) return
    setItems((prev) => {
      const fromItems = prev[from]
      const toItems = prev[to]
      if (!fromItems || !toItems) return prev
      const id = Number(active.id)
      const overIndex =
        typeof over.id === 'string' && over.id in prev
          ? toItems.length
          : (() => {
              const idx = toItems.indexOf(Number(over.id))
              return idx >= 0 ? idx : toItems.length
            })()
      return {
        ...prev,
        [from]: fromItems.filter((x) => x !== id),
        [to]: [...toItems.slice(0, overIndex), id, ...toItems.slice(overIndex)],
      }
    })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    const id = Number(active.id)
    const container = containerOf(id)
    if (!over || !container) {
      setActiveId(null)
      return
    }

    // Finalise ordering within the (already-moved) container.
    let next = items
    const arr = items[container]
    if (!arr) {
      setActiveId(null)
      return
    }
    const oldIndex = arr.indexOf(id)
    let newIndex = arr.length - 1
    if (typeof over.id !== 'string') {
      const oi = arr.indexOf(Number(over.id))
      if (oi >= 0) newIndex = oi
    }
    if (oldIndex >= 0 && oldIndex !== newIndex) {
      next = { ...items, [container]: arrayMove(arr, oldIndex, newIndex) }
      setItems(next)
    }

    const status = container as Status
    const col = next[status] ?? []
    const k = col.indexOf(id)
    const { before, after } = neighbors(col, k)

    // No effective change → let the idle re-sync restore canonical order.
    const s = startRef.current
    if (s && s.status === status && s.before === before && s.after === after) {
      setActiveId(null)
      return
    }

    patchCache(id, status, before, after)
    move.mutate({ id, status, beforeId: before, afterId: after })
    setActiveId(null)

    // Toast with a one-tap revert back to where the card started.
    if (s) {
      const origStatus = s.status as Status
      const origBefore = s.before
      const origAfter = s.after
      const msg =
        origStatus === status ? 'Đã đổi thứ tự' : `Đã chuyển sang ${STATUS_META[status].label}`
      toast.show(msg, {
        action: {
          label: 'Hoàn tác',
          onClick: () => {
            patchCache(id, origStatus, origBefore, origAfter)
            move.mutate({ id, status: origStatus, beforeId: origBefore, afterId: origAfter })
          },
        },
      })
    }
  }

  /** Optimistically patch the papers cache so the card holds its new column/order until refetch. */
  function patchCache(id: number, status: Status, before: number | null, after: number | null) {
    const posOf = (n: number | null) => (n == null ? null : (byId.get(n)?.position ?? null))
    const above = posOf(before)
    const below = posOf(after)
    let position: number
    if (above != null && below != null) position = (above + below) / 2
    else if (below != null) position = below - 1
    else if (above != null) position = above + 1
    else position = papers.reduce((m, p) => Math.max(m, p.position), 0) + 1

    const today = new Date().toISOString().slice(0, 10)
    qc.setQueryData<Paper[]>(qk.papers, (old) =>
      old?.map((p) =>
        p.id === id
          ? {
              ...p,
              status,
              position,
              // Match the server: entering a status records today() (aging counts
              // from the most recent entry), so re-entry doesn't flicker on refetch.
              history: { ...p.history, [status]: today },
            }
          : p,
      ),
    )
  }

  const activePaper = activeId != null ? byId.get(activeId) : undefined

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div
        className="grid animate-pt-fade gap-5 overflow-x-auto pb-2"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(185px, 1fr))` }}
      >
        {columns.map((status) => (
          <Column
            key={status}
            status={status}
            ids={items[status] ?? []}
            byId={byId}
            onOpen={openPaperDetail}
            onAdvance={(id) => advance.mutate(id)}
          />
        ))}
      </div>

      {/* Portal the overlay to <body> so its position:fixed is viewport-relative;
          the `animate-pt-page` ancestor keeps a transform (fill-mode both) that
          would otherwise become the containing block and offset the drag image.
          Drop animation is disabled — the optimistic state already renders the
          card at its destination, so animating the overlay back would fly it to
          the wrong (origin) rect. */}
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {activePaper ? (
            <PaperCard paper={activePaper} onOpen={() => {}} onAdvance={() => {}} />
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}
