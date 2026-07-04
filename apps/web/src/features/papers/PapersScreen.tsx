import { PAPER_GROUP_SLUGS } from '@/app/nav'
import { ScreenHeader, SearchInput } from '@/components/ui'
import { usePapers } from '@/lib/queries'
import { GROUPS, type GroupKey, type Status } from '@papertrack/shared'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { KanbanBoard } from './KanbanBoard'
import { PaperLedger } from './PaperLedger'
import { StatusFilterStrip } from './StatusFilterStrip'
import { type PaperView, ViewToggle } from './ViewToggle'
import { PAPERS_HEADING, matchesQuery } from './helpers'

export function PapersScreen() {
  const { group = 'dang-xu-ly' } = useParams()
  const groupKey: GroupKey = PAPER_GROUP_SLUGS[group] ?? 'inprocess'
  // Remount on group change so search/filter/view reset within the same commit —
  // avoids the stale frame a post-paint reset effect would leave behind.
  return <PapersView key={groupKey} groupKey={groupKey} />
}

function PapersView({ groupKey }: { groupKey: GroupKey }) {
  const { data: papers } = usePapers()

  const [q, setQ] = useState('')
  const [pfilter, setPfilter] = useState<Status | 'all'>('all')
  const [view, setView] = useState<PaperView>('kanban')

  const canKanban = groupKey !== 'all'
  const effectiveView: PaperView = canKanban ? view : 'ledger'
  const statuses = GROUPS[groupKey].statuses

  const base = useMemo(
    () => (papers ?? []).filter((p) => statuses.includes(p.status)),
    [papers, statuses],
  )
  const searched = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return needle ? base.filter((p) => matchesQuery(p, needle)) : base
  }, [base, q])
  const filtered = useMemo(
    () => (pfilter === 'all' ? searched : searched.filter((p) => p.status === pfilter)),
    [searched, pfilter],
  )

  return (
    <div className="animate-pt-page">
      <ScreenHeader
        watermark="№"
        eyebrow={PAPERS_HEADING[groupKey]}
        caption={`${base.length} hồ sơ`}
        rule={false}
      >
        <SearchInput
          placeholder="Tìm tên bài, tạp chí, tác giả…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {canKanban && <ViewToggle value={view} onChange={setView} />}
      </ScreenHeader>

      <StatusFilterStrip
        papers={searched}
        statuses={statuses}
        selected={pfilter}
        onSelect={setPfilter}
      />

      {effectiveView === 'ledger' ? (
        <PaperLedger key={groupKey} papers={filtered} />
      ) : (
        <KanbanBoard key={groupKey} papers={filtered} group={groupKey} />
      )}
    </div>
  )
}
