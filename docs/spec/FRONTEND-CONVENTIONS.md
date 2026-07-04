# PaperTrack Frontend Conventions (READ FIRST)

You are building one screen of a React 19 + Vite + Tailwind v4 app that recreates a vintage
archival-ledger design **pixel-faithfully**. The full visual spec is `docs/spec/01-design-spec.md`
(colors, type, animations, per-screen layout, exact Vietnamese copy). The business-logic spec is
`docs/spec/02-logic-spec.md` / `03-framework-spec.md`. **Match the design; do not invent.**

## Hard rules

- **Vietnamese copy must be verbatim** from the design spec (labels, buttons, empty states, units `₫`).
- Use the **existing primitives and hooks** below — do not re-implement buttons, stamps, drawers, etc.
- Only create/edit files inside **your assigned feature folder** (+ the specific files named in your task).
  Never edit `src/components/ui/*`, `src/lib/*`, `src/app/*`, `src/components/layout/*`, `package.json`,
  or another feature's folder.
- **Do not run `pnpm typecheck`/`build`** (other agents are writing concurrently — it will show false errors).
  Write correct, self-consistent TypeScript. The controller typechecks at the end.
- React 19: **no `forwardRef`** (accept `ref` as a normal prop); use `use(Context)` not `useContext`.
- Animate **transform/opacity only**; buttons already handle `:active` scale. Respect the design's keyframes
  (classes `animate-pt-up|pt-ink|pt-draw|pt-fade|pt-stamp|pt-panel|pt-page`). Wrap each screen root in
  `<div className="animate-pt-page">`. Stagger entrances 30–80ms via inline `style={{ animationDelay }}`.

## Design tokens (Tailwind classes — already configured)

Colors (use as `bg-*`, `text-*`, `border-*`): `paper` `paper-0` `paper-drawer` `paper-note` `paper-card`
`paper-chip` `paper-abbr` `paper-head` `tab` `tab-hover` · `ink` `ink-sig` `ink-note` `ink-rank` `muted`
`muted-2` `faint` · `rule` `rule-2` `rule-3` `ruled` `dotline` `line` `line-chip` · `seal` `gold` `washi`
· status: `st-nop st-pb st-cs st-dg st-ca st-wait st-pub st-reward st-rej` · finance: `collect pay settled
positive link`.

Fonts: `font-serif` (Spectral, body), `font-display` (Instrument Serif, big numerals + wordmark),
`font-mono` (IBM Plex Mono, uppercase micro-labels/badges/dates), `font-script` (Dancing Script, red
handwritten annotations like "kỷ lục!", "chờ N ng — lâu!", "gấp!").

Texture/surface utility classes: `paper-texture`, `paper-texture-note`, `margin-rule` (red ledger rule
~44px in — put on row containers), `washi-tape`, `double-rule`, `shadow-stamp` (+ hover variant on Button),
`stamp-edge`, `wobble-ring` (hand-drawn ring around record numerals). Signature red button shadow lives in
`<Button variant="primary">`.

## Primitives — `import { … } from '@/components/ui'`

- `<Button variant="primary|ghost|ghost-red|text" size="sm|md">` — primary = dark + hard red offset shadow.
- `<StatusStamp status short rotate />`, `<RankChip rank />`, `<ProgressDots status />`, `<PaymentPill payment />`,
  `<Tally count />`, `statusColor(status)` → hex.
- `<Avatar name size framed />` (initials, sepia-toned).
- `<CountdownCircle days size rotate />` (urgent ≤15 red, warn ≤30, past ✓).
- `<ScreenHeader watermark eyebrow caption>{rightControls}</ScreenHeader>` (giant faint watermark letter +
  mono eyebrow + italic caption + ptDraw underline). `<Section eyebrow right>{…}</Section>`. `<SectionRule/>`,
  `<Watermark/>`, `<WaxSeal top label date/>`, `<StickyNote/>`, `<StatCell eyebrow value sub onClick delay/>`.
- `<Field label hint full>`, `<Input/>`, `<Textarea/>`, `<Select/>`, `<SearchInput/>`.
- `<Pager total pageSize page onPage noun/>`.
- `<Drawer open onClose width>` + `<DrawerHeader tab sub onClose/>` `<DrawerBody/>` `<DrawerFooter/>`.
- `<Modal open onClose maxWidth>` + `<ModalHeader title sub right onClose/>` `<ModalBody/>` `<ModalFooter/>`.
- `useToast()` → `{ show(message, tone?) }`.

## Data hooks — `import { … } from '@/lib/queries'`

Reads: `usePapers()` → `Paper[]`; `usePaper(id|null)` → paper + `attachments`; `useOverview()` →
`{stats, deadlines}`; `useSettlement()` → `Settlement`; `useNotifications()`; `useInventory()`;
`useAuthors() useJournals() useConferences() useSpecialIssues() useRewardCategories()`.

Mutations: `usePaperMutations()` → `{create,update,remove,advance,reject,restore,settlePay,settleReward}`
(each a TanStack mutation; call `.mutate(vars)` / `.mutateAsync(vars)`). `useMovePaper()` (kanban).
`useAttachmentMutations(paperId)` → `{upload,remove}`. `useCatalogMutations('authors'|'journals'|
'conferences'|'specialIssues'|'rewardCategories')` → `{create,update,remove}`. `useDataMutations()`.
For file download: `api.attachments.downloadUrl(id)`. Direct client: `import { api } from '@/lib/api'`.

## Shared domain helpers — `import { … } from '@papertrack/shared'`

Vocab: `STATUS_META` (record: {label,short,color,group}), `STATUSES`, `PIPELINE`, `GROUPS`, `KANBAN_COLUMNS`,
`pipelineIndex`, `nextStatus`, `statusGroup`, `rewardEligible`, `isPublished`, `parseRoles`, `PAYMENT_META`,
`bestQuartile`. Reward: `DEFAULT_REWARD_CATEGORIES`, `matchRewardCategory(rank,type,cats)`, `rewardAmountFor`,
`REWARD_GROUP_ORDER`. Format: `money(n)`→"3,32 tỷ ₫", `moneySplit(n)`→{v,u}, `formatMoney` (grouped, no unit),
`parseMoney`, `formatDateDots` (→"03.07.2026"), `formatDateLong`, `formatDateSigned`, `agingFor(refDate)`→
{days,long,label}, `daysUntil`, `daysSince`, `initials`, `pct`, `parseVnDate`. Stats (usually via API, but
available): `computeOverview`, `computeSettlement`, `computeDeadlines`, `paperTotal(paper)`.

Types: `Paper Author Journal Conference SpecialIssue RewardCategory Attachment Status PaperType Deadline
OverviewStats Settlement SettleSlip` (+ input types `PaperInput` etc.).

## Global overlays (already wired) — `import { useOverlays } from '@/app/overlays'`

`useOverlays()` → `{ openCreatePaper(), openEditPaper(id), openPaperDetail(id), closeAll() }`. Kanban cards,
ledger rows, and ledger previews open the detail drawer via `openPaperDetail(id)`. Do NOT render your own
paper detail drawer / paper create-modal — those are global (owned by the papers-overlay agent).

## Aging / status notes

`Paper.history` is `{ [status]: ISODate }`. Aging reference date = `history[status] || date`; show `agingFor()`
only for **in-process** papers (`statusGroup(p.status)==='inprocess'`), red when `.long`. Status color =
`STATUS_META[status].color`. Advance target = `nextStatus(status)`.
