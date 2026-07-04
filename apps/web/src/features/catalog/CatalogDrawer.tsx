import type { CatalogKind } from '@/app/nav'
import { useOverlays } from '@/app/overlays'
import {
  Avatar,
  Button,
  CountdownCircle,
  Drawer,
  DrawerBody,
  DrawerHeader,
  statusColor,
  useToast,
} from '@/components/ui'
import {
  useAuthors,
  useCatalogMutations,
  useConferences,
  useJournals,
  usePapers,
  useRewardCategories,
  useSpecialIssues,
} from '@/lib/queries'
import {
  type Author,
  type Conference,
  DEFAULT_REWARD_CATEGORIES,
  type Journal,
  type Paper,
  type SpecialIssue,
  daysUntil,
  formatDateDots,
  initials,
  isPublished,
  matchRewardCategory,
  money,
  pad,
  pipelineIndex,
  statusGroup,
} from '@papertrack/shared'
import type { ReactNode } from 'react'
import { hostOf } from './catalog-fields'

interface Fact {
  k: string
  v: string
}

const isVenue = (p: Paper, name: string) => p.venue === name
const authorsShort = (p: Paper) => (p.authors ?? []).map(initials).join(', ') || '—'

export function CatalogDrawer({
  kind,
  recordId,
  onClose,
  onReopen,
  onEdit,
}: {
  kind: CatalogKind
  recordId: number | null
  onClose: () => void
  /** Reopen this drawer on a record — used to return here after a stacked paper. */
  onReopen: (id: number) => void
  onEdit: (id: number, values: Record<string, string>) => void
}) {
  const overlays = useOverlays()
  const toast = useToast()
  const journals = useJournals().data ?? []
  const conferences = useConferences().data ?? []
  const specialIssues = useSpecialIssues().data ?? []
  const authors = useAuthors().data ?? []
  const papers = usePapers().data ?? []
  const cats = useRewardCategories().data ?? DEFAULT_REWARD_CATEGORIES
  const { remove } = useCatalogMutations(kind)

  const open = recordId != null
  // Stack the paper detail over this drawer: close here, but hand the paper a
  // back path so closing/going back on it returns to this same record.
  const openPaper = (id: number) => {
    const parentId = recordId
    onClose()
    overlays.openPaperDetail(
      id,
      parentId != null ? { onBack: () => onReopen(parentId) } : undefined,
    )
  }

  return (
    <Drawer open={open} onClose={onClose} width={440} label="Chi tiết danh mục">
      <Body
        kind={kind}
        recordId={recordId}
        journals={journals}
        conferences={conferences}
        specialIssues={specialIssues}
        authors={authors}
        papers={papers}
        cats={cats}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={(id, message, toastMsg) => {
          if (!window.confirm(message)) return
          remove.mutate(id, {
            onSuccess: () => {
              onClose()
              toast.show(toastMsg)
            },
          })
        }}
        openPaper={openPaper}
      />
    </Drawer>
  )
}

// ─── Body (needs a resolved record; rendered inside the open Drawer) ─────────────
function Body({
  kind,
  recordId,
  journals,
  conferences,
  specialIssues,
  authors,
  papers,
  cats,
  onClose,
  onEdit,
  onDelete,
  openPaper,
}: {
  kind: CatalogKind
  recordId: number | null
  journals: Journal[]
  conferences: Conference[]
  specialIssues: SpecialIssue[]
  authors: Author[]
  papers: Paper[]
  cats: typeof DEFAULT_REWARD_CATEGORIES
  onClose: () => void
  onEdit: (id: number, values: Record<string, string>) => void
  onDelete: (id: number, message: string, toastMsg: string) => void
  openPaper: (id: number) => void
}) {
  const dateVal = (s: string | undefined) => (s ?? '').slice(0, 10)

  if (kind === 'authors') {
    const idx = authors.findIndex((a) => a.id === recordId)
    const a = authors[idx]
    if (!a) return <Loading onClose={onClose} tab="Tác giả" sub="danh bạ tác giả của khoa" />

    const mine = papers.filter((p) => (p.authors ?? []).includes(a.name))
    const act = mine.filter((p) => statusGroup(p.status) !== 'rejected')
    const q12 = act.filter(
      (p) => (p.rank ?? '').includes('Q1') || (p.rank ?? '').includes('Q2'),
    ).length
    const pub = act.filter((p) => isPublished(p.status)).length
    const rewardSum = papers
      .filter((p) => pipelineIndex(p.status) >= 4 && (p.authors ?? []).includes(a.name))
      .reduce((t, p) => {
        const c = matchRewardCategory(p.rank, undefined, cats)
        return t + (c ? c.amount / Math.max((p.authors ?? []).length, 1) : 0)
      }, 0)

    const facts: Fact[] = [
      { k: 'Email', v: a.email || '—' },
      { k: 'Đơn vị', v: a.unit || '—' },
    ]
    if (a.orcid) facts.push({ k: 'ORCID', v: a.orcid })
    if (a.bank) facts.push({ k: 'Tài khoản', v: a.bank })
    if (a.note) facts.push({ k: 'Ghi chú', v: a.note })

    return (
      <>
        <DrawerHeader
          tab={`Tác giả №${pad(idx + 1)}`}
          sub="danh bạ tác giả của khoa"
          onClose={onClose}
        />
        <DrawerBody>
          <div className="float-right ml-4 mb-3 mt-0.5">
            <TapedPhoto name={a.name} />
          </div>

          <div
            className="inline-block origin-left animate-pt-ink border-b border-dotted border-dotline px-1 pb-1 font-script text-[36px] font-semibold leading-[1.15] text-ink-sig"
            style={{ transform: 'rotate(-1.2deg)', animationDelay: '0.1s' }}
          >
            {a.name}
          </div>
          <div
            className="mt-1.5 animate-pt-up font-serif text-[14px] italic text-muted"
            style={{ animationDelay: '0.18s' }}
          >
            {a.title ? `${a.title} — ` : ''}
            {a.unit || '—'}
          </div>

          <div
            className="mt-5 grid animate-pt-up grid-cols-3 border-t border-rule pt-3.5"
            style={{ animationDelay: '0.3s' }}
          >
            {[
              { n: act.length, label: 'BÀI BÁO' },
              { n: q12, label: 'Q1 · Q2' },
              { n: pub, label: 'CÔNG BỐ' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display text-[27px] font-medium leading-[1.05] text-ink">
                  {s.n}
                </div>
                <div className="mt-1 font-mono text-[8.5px] uppercase tracking-[1.4px] text-muted">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <Section label="Liên hệ" delay={0.38}>
            <Facts facts={facts} />
          </Section>

          <Section label="Khen thưởng ước tính — phần chia" delay={0.46}>
            <div className="font-serif text-[15px]">
              <span className="font-semibold text-ink">{money(Math.round(rewardSum))}</span>
              <span className="italic text-muted"> — từ các bài đạt mức Chấp nhận trở lên</span>
            </div>
          </Section>

          <LinkedList
            label="Sổ bài báo"
            count={mine.length}
            empty="Chưa có bài nào trong sổ."
            delay={0.58}
            rows={mine.map((p) => ({
              paper: p,
              sub: `${p.venue} · ${(p.authors ?? []).indexOf(a.name) === 0 ? 'tác giả chính' : 'đồng tác giả'}`,
            }))}
            onOpen={openPaper}
          />

          <Actions
            delay={0.64}
            onEdit={() =>
              onEdit(a.id, {
                name: a.name,
                title: a.title ?? '',
                unit: a.unit ?? '',
                email: a.email ?? '',
                orcid: a.orcid ?? '',
                bank: a.bank ?? '',
              })
            }
            onDelete={() =>
              onDelete(
                a.id,
                'Xóa tác giả này khỏi danh bạ? Tên trên các hồ sơ bài báo vẫn được giữ nguyên.',
                'Đã xóa khỏi danh bạ',
              )
            }
          />
        </DrawerBody>
      </>
    )
  }

  // ── Venue kinds: journal / conf / si ──────────────────────────────────────────
  if (kind === 'journals') {
    const idx = journals.findIndex((j) => j.id === recordId)
    const j = journals[idx]
    if (!j) return <Loading onClose={onClose} tab="Tạp chí" sub="danh mục tạp chí" />

    const linked = papers.filter((p) => isVenue(p, j.name))
    const pub = linked.filter((p) => isPublished(p.status)).length
    const cat = matchRewardCategory(j.rank, undefined, cats)
    const impact = j.impact ? j.impact.replace('.', ',') : ''

    const facts: Fact[] = []
    if (j.issn) facts.push({ k: 'ISSN', v: j.issn })
    if (impact) facts.push({ k: 'Impact Factor', v: impact })
    if (j.publisher) facts.push({ k: 'Nhà xuất bản', v: j.publisher })
    if (j.fee) facts.push({ k: 'Phí đăng bài', v: j.fee })
    if (j.country) facts.push({ k: 'Quốc gia', v: j.country })
    if (j.web) facts.push({ k: 'Website', v: hostOf(j.web) })
    facts.push({ k: 'Bài đã gửi / công bố', v: `${linked.length} / ${pub}` })

    return (
      <VenueDetail
        tab="Tạp chí"
        no={pad(idx + 1)}
        tabSub="danh mục tạp chí"
        title={j.name}
        subLine={`${j.publisher || '—'} · ${j.country || '—'}`}
        rank={j.rank}
        rankNote={impact ? `Impact Factor ${impact}` : ''}
        factsLabel="Thông tin tạp chí"
        facts={facts}
        cat={cat}
        linkedLabel="Bài đã gửi tới tạp chí"
        linkedEmpty="Chưa có bài nào gửi tới tạp chí này."
        linked={linked.map((p) => ({
          paper: p,
          sub: `nộp ${formatDateDots(p.date)} · ${authorsShort(p)}`,
        }))}
        onClose={onClose}
        openPaper={openPaper}
        onEdit={() =>
          onEdit(j.id, {
            name: j.name,
            publisher: j.publisher ?? '',
            rank: j.rank ?? '',
            issn: j.issn ?? '',
            impact: j.impact ?? '',
            country: j.country ?? '',
          })
        }
        onDelete={() => onDelete(j.id, 'Xóa tạp chí này khỏi danh mục?', 'Đã xóa khỏi danh mục')}
      />
    )
  }

  // conf | si share the collection lookup
  const isConf = kind === 'conferences'
  const coll: (Conference | SpecialIssue)[] = isConf ? conferences : specialIssues
  const idx = coll.findIndex((x) => x.id === recordId)
  const c = coll[idx]
  if (!c) {
    return (
      <Loading
        onClose={onClose}
        tab={isConf ? 'Hội thảo' : 'Special Issue'}
        sub={isConf ? 'lịch hội thảo khoa học' : 'lời mời đang mở'}
      />
    )
  }

  const conf = isConf ? (c as Conference) : null
  const si = isConf ? null : (c as SpecialIssue)
  const d = daysUntil(c.deadline)
  const past = d == null || d < 0
  const cat = matchRewardCategory(c.rank, undefined, cats)
  const linked = isConf ? papers.filter((p) => p.venue && c.name.includes(p.venue)) : []

  const facts: Fact[] = isConf
    ? ([
        { k: 'Hạn nộp bài', v: formatDateDots(conf!.deadline) },
        { k: 'Ngày diễn ra', v: formatDateDots(conf!.confdate) },
        conf!.location ? { k: 'Địa điểm', v: conf!.location } : null,
        { k: 'Phí tham dự', v: conf!.fee ? money(conf!.fee) : conf!.feeText || '—' },
        conf!.web ? { k: 'Website', v: hostOf(conf!.web) } : null,
      ].filter(Boolean) as Fact[])
    : [
        { k: 'Loại', v: si!.type || 'Special Issue' },
        { k: 'Tạp chí / NXB', v: si!.journal || '—' },
        { k: 'Hạn nộp', v: formatDateDots(si!.deadline) },
      ]

  const tab = isConf ? 'Hội thảo' : si!.type === 'Book Chapter' ? 'Chương sách' : 'Special Issue'

  return (
    <VenueDetail
      tab={tab}
      no={pad(idx + 1)}
      tabSub={isConf ? 'lịch hội thảo khoa học' : 'lời mời đang mở'}
      title={c.name}
      subLine={
        isConf ? conf!.location || '—' : `${si!.journal || '—'} · ${si!.type || 'Special Issue'}`
      }
      rank={c.rank}
      rankNote=""
      countdown={{
        days: d ?? -1,
        note: past
          ? `Đã qua hạn nộp bài (${formatDateDots(c.deadline)}).`
          : `Còn ${d} ngày đến hạn nộp bài — ${formatDateDots(c.deadline)}.`,
      }}
      factsLabel={isConf ? 'Thông tin hội thảo' : 'Thông tin'}
      facts={facts}
      cat={cat}
      linkedLabel={isConf ? 'Bài đã gửi' : ''}
      linkedEmpty="Chưa có bài nào gửi tới hội thảo này."
      linked={
        isConf
          ? linked.map((p) => ({
              paper: p,
              sub: `nộp ${formatDateDots(p.date)} · ${authorsShort(p)}`,
            }))
          : null
      }
      onClose={onClose}
      openPaper={openPaper}
      onEdit={() =>
        onEdit(
          c.id,
          isConf
            ? {
                name: conf!.name,
                location: conf!.location ?? '',
                deadline: dateVal(conf!.deadline),
                confdate: dateVal(conf!.confdate),
                fee: conf!.fee ? String(conf!.fee) : '',
                rank: conf!.rank ?? '',
              }
            : {
                name: si!.name,
                journal: si!.journal ?? '',
                rank: si!.rank ?? '',
                deadline: dateVal(si!.deadline),
                type: si!.type || 'Special Issue',
              },
        )
      }
      onDelete={() =>
        onDelete(
          c.id,
          isConf ? 'Xóa hội thảo này khỏi lịch?' : 'Xóa mục này khỏi danh sách?',
          'Đã xóa khỏi danh mục',
        )
      }
    />
  )
}

// ─── Venue (journal / conf / si) presentational shell ────────────────────────────
function VenueDetail({
  tab,
  no,
  tabSub,
  title,
  subLine,
  rank,
  rankNote,
  countdown,
  factsLabel,
  facts,
  cat,
  linkedLabel,
  linkedEmpty,
  linked,
  onClose,
  openPaper,
  onEdit,
  onDelete,
}: {
  tab: string
  no: string
  tabSub: string
  title: string
  subLine: string
  rank: string
  rankNote: string
  countdown?: { days: number; note: string }
  factsLabel: string
  facts: Fact[]
  cat: (typeof DEFAULT_REWARD_CATEGORIES)[number] | null
  linkedLabel: string
  linkedEmpty: string
  linked: { paper: Paper; sub: string }[] | null
  onClose: () => void
  openPaper: (id: number) => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <>
      <DrawerHeader tab={`${tab} №${no}`} sub={tabSub} onClose={onClose} />
      <DrawerBody>
        <h2
          className="animate-pt-ink font-serif text-[21px] font-semibold leading-[1.35] text-ink"
          style={{ animationDelay: '0.1s' }}
        >
          {title}
        </h2>
        <div
          className="mt-1.5 animate-pt-up font-serif text-[14px] italic text-muted"
          style={{ animationDelay: '0.18s' }}
        >
          {subLine}
        </div>

        {rank && (
          <div
            className="mt-3 flex animate-pt-up items-baseline gap-2.5"
            style={{ animationDelay: '0.24s' }}
          >
            <span
              className="border border-line-chip bg-paper-chip px-2 py-0.5 font-mono text-[9.5px] tracking-[0.5px] text-ink-rank"
              style={{ transform: 'rotate(-1.2deg)' }}
            >
              {rank}
            </span>
            {rankNote && <span className="font-mono text-[10px] text-faint">{rankNote}</span>}
          </div>
        )}

        {countdown && (
          <div
            className="mt-5 flex animate-pt-up items-center gap-4 border-t border-rule pt-3.5"
            style={{ animationDelay: '0.3s' }}
          >
            <span
              className="animate-pt-stamp"
              style={{ display: 'inline-flex', transform: 'rotate(-3deg)', animationDelay: '0.4s' }}
            >
              <CountdownCircle days={countdown.days} size={64} />
            </span>
            <div className="font-serif text-[13.5px] italic leading-[1.5] text-muted">
              {countdown.note}
            </div>
          </div>
        )}

        <Section label={factsLabel} delay={0.38}>
          <Facts facts={facts} />
        </Section>

        {cat && (
          <Section label="Khen thưởng áp dụng — Quy chế 2026" delay={0.46}>
            <div className="font-serif text-[15px]">
              <span className="font-semibold text-ink">{money(cat.amount)}</span>
              <span className="italic text-muted"> — {cat.name}</span>
            </div>
          </Section>
        )}

        {linked && (
          <LinkedList
            label={linkedLabel}
            count={linked.length}
            empty={linkedEmpty}
            delay={0.58}
            rows={linked}
            onOpen={openPaper}
          />
        )}

        <Actions delay={0.64} onEdit={onEdit} onDelete={onDelete} />
      </DrawerBody>
    </>
  )
}

// ─── Small building blocks ───────────────────────────────────────────────────────
function Section({
  label,
  delay,
  children,
}: { label: ReactNode; delay: number; children: ReactNode }) {
  return (
    <div
      className="mt-5 animate-pt-up border-t border-rule pt-3"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="font-mono text-[9px] uppercase tracking-[1.6px] text-muted">{label}</div>
      <div className="mt-2.5">{children}</div>
    </div>
  )
}

function Facts({ facts }: { facts: Fact[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {facts.map((f, i) => (
        <div key={i} className="flex items-baseline">
          <span className="whitespace-nowrap font-serif text-[13.5px] text-muted">{f.k}</span>
          <span className="mx-2 flex-1 -translate-y-[3px] border-b border-dotted border-rule-2" />
          <span className="text-right font-mono text-[11px] text-ink">{f.v}</span>
        </div>
      ))}
    </div>
  )
}

function LinkedList({
  label,
  count,
  empty,
  delay,
  rows,
  onOpen,
}: {
  label: string
  count: number
  empty: string
  delay: number
  rows: { paper: Paper; sub: string }[]
  onOpen: (id: number) => void
}) {
  return (
    <div
      className="mt-5 animate-pt-up border-t border-rule pt-3"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[1.6px] text-muted">{label}</span>
        <span className="font-mono text-[10px] text-faint">· {count}</span>
      </div>
      <div className="mt-1.5 flex flex-col">
        {rows.map(({ paper, sub }) => {
          const color = statusColor(paper.status)
          return (
            <button
              type="button"
              key={paper.id}
              onClick={() => onOpen(paper.id)}
              className="flex items-baseline gap-2.5 border-b border-rule-3 py-2.5 text-left transition-colors hover:bg-[rgba(163,56,43,0.05)]"
            >
              <span
                className="shrink-0 whitespace-nowrap px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.8px]"
                style={{ color, border: `1px solid ${color}`, borderRadius: '3px/6px' }}
              >
                {paper.status}
              </span>
              <span className="min-w-0">
                <span className="block font-serif text-[13.5px] font-medium leading-[1.35] text-ink">
                  {paper.title}
                </span>
                <span className="mt-px block font-serif text-[11.5px] italic text-muted">
                  {sub}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      {!rows.length && (
        <div className="py-2 font-serif text-[12.5px] italic text-faint">{empty}</div>
      )}
    </div>
  )
}

function Actions({
  delay,
  onEdit,
  onDelete,
}: { delay: number; onEdit: () => void; onDelete: () => void }) {
  return (
    <div
      className="mt-6 flex animate-pt-up gap-2.5 border-t border-rule pt-4"
      style={{ animationDelay: `${delay}s` }}
    >
      <Button variant="primary" size="sm" className="flex-1" onClick={onEdit}>
        ✎ Sửa
      </Button>
      <Button variant="ghost-red" size="sm" onClick={onDelete}>
        ✕ Xóa
      </Button>
    </div>
  )
}

function TapedPhoto({ name }: { name: string }) {
  return (
    <div
      className="relative animate-pt-fade bg-paper-note p-[5px] pb-4"
      style={{
        transform: 'rotate(2deg)',
        boxShadow: '2px 3px 8px rgba(34,29,20,0.14)',
        animationDelay: '0.15s',
      }}
    >
      <span
        aria-hidden
        className="washi-tape absolute left-1/2 top-[-8px] h-4 w-[54px] -translate-x-1/2"
        style={{ transform: 'translateX(-50%) rotate(-3deg)' }}
      />
      <Avatar name={name} size={76} height={84} cover />
      <div className="absolute inset-x-0 bottom-0.5 text-center font-mono text-[7px] tracking-[1.4px] text-faint">
        ẢNH 3×4
      </div>
    </div>
  )
}

function Loading({ onClose, tab, sub }: { onClose: () => void; tab: string; sub: string }) {
  return (
    <>
      <DrawerHeader tab={tab} sub={sub} onClose={onClose} />
      <DrawerBody>
        <p className="font-serif text-[13px] italic text-muted">Đang tải…</p>
      </DrawerBody>
    </>
  )
}
