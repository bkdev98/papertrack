I have everything I need. Here is the full specification.

---

# PaperTrack Design Bundle — Reimplementation Spec

Source bundle: `/private/tmp/claude-501/-Users-quocs-Projects-papertrack/a7f5df71-0eb7-4050-ba82-9caa3a74483d/scratchpad/design-extract/papertrack-redesign/project/`

## 0. File inventory (what each file is)

| File | Lines | Role |
|---|---|---|
| `support.js` | 1658 | The **DC template-framework runtime** (a generated bundle of `dc-runtime`). Parses `<x-dc>` templates, compiles them to React, and evaluates a `class Component extends DCLogic`. Contains **no PaperTrack domain logic** — pure framework. |
| `papertrack-data.js` | 6155 | `export const DEFAULT_DB = {...}` — the real seed database (150 papers, 92 journals, 43 conferences, 50 authors, 23 reward categories). This is the data the designs render from. |
| `PaperTrack.dc.html` | 2189 | **Canonical / newest full app.** Richest variant: grouped nav, internal-finance settlement, pagination, catalog detail. Fonts: Spectral / Instrument Serif / Dancing Script. |
| `PaperTrack v1.dc.html` | 1094 | **Earlier full app.** All the same screens minus finance-settlement, pagination and catalog-detail. Simpler cost model. Fonts: Newsreader / Patrick Hand. The best single file to read end-to-end because its `renderVals()` is fully self-contained. |
| `PaperTrack Redesign.dc.html` | 342 | **Static design study** (design-review option "2a", "Xưởng giấy"/paper-workshop). Dashboard only, all values hard-coded, no data binding. Just a visual-direction artifact. |
| `PaperTrack Unlock.dc.html` | ~330 | A **passcode gate splash** ("Mở khóa") that, on success, redirects to `PaperTrack.dc.html`. |

Everything is a single-page, single-component app. There is **no routing** — "pages" are `sc-if` branches switched by a `state.page` string. Persistence is `localStorage` key `papertrack2.db`; the seed comes from a dynamic `import('./papertrack-data.js')`.

---

## 1. DC FRAMEWORK (how to translate any `.dc.html` to React)

### 1.1 Document shape

```html
<script src="./support.js"></script>          <!-- boots the runtime -->
...
<x-dc>                                          <!-- the "template" = JSX body -->
  <helmet data-dc-atomics> ... </helmet>        <!-- head injection -->
  ...markup with {{bindings}}, <sc-if>, <sc-for>...
</x-dc>
<script type="text/x-dc" data-dc-script data-props="{...}">
  class Component extends DCLogic {              // the component logic
    state = {...}
    componentDidMount(){...}
    renderVals(){ return {...} }                 // computes the "vals" object
  }
</script>
```

`support.js` on boot: finds `<x-dc>`, compiles its `innerHTML` into a builder tree, evaluates the `<script data-dc-script>` into a `Component` class, mounts a React root, and re-renders on `setState`. **The mental model is exactly a React class component**: `state`, `props`, `setState`, `componentDidMount/DidUpdate/WillUnmount`, plus one extra method `renderVals()`.

### 1.2 The Component logic class → React

`DCLogic` (aka `StreamableLogic`, `support.js:716`) is the base class. Key behaviors to replicate:

- **`renderVals()` returns a flat object** that is merged **over** `props` (`support.js:984`: `vals = { ...userProps, ...this.logic.renderVals() }`). Every `{{key}}` in the template resolves against this merged object. → In React: `renderVals()` is the *body* of your function component; its returned keys become the values you bind in JSX. Props are visible unless a `renderVals` key shadows them.
- **`this.state` / `this.setState(patch|fn, cb)`** behave like React (shallow merge). `this.props` are the component props.
- **Lifecycle** `componentDidMount/componentDidUpdate/componentWillUnmount` are called as in React.
- Handlers are plain methods/closures placed **into the returned vals** (e.g. `openAdd: () => this.setState(...)`) and bound in the template as `onClick="{{openAdd}}"`.
- The class must be named `Component` and extend `DCLogic` (the runtime requires this exact contract; `support.js:1484`).

There is exactly **one** component per file (no child DCs are used in this bundle), so a faithful React port is **one big component** whose body is `renderVals()`.

### 1.3 Template directives — translation table

| DC construct | Meaning | React equivalent | Runtime ref |
|---|---|---|---|
| `{{expr}}` in text | interpolate | `{expr}` | `walkText` `support.js:474` |
| `attr="{{expr}}"` (whole value) | pass raw resolved value | `attr={expr}` (value can be a **function**, object, array) | `compileAttr` `support.js:370` |
| `attr="a-{{x}}-b"` (mixed) | string concat, `undefined→""` | template literal | `compileAttr` |
| `<sc-if value="{{cond}}">…</sc-if>` | render children iff truthy | `{cond && (…)}` | `walkIf` `support.js:551` |
| `<sc-for list="{{arr}}" as="it">…</sc-for>` | map array; exposes `it` and `$index` | `arr.map((it,$index)=>(…))` | `walkFor` `support.js:516` |
| `<x-import from=… component=…>` | external ESM/global component | (not used here) | `walkXImport` `support.js:595` |
| `<dc-import name="Foo">` | sibling `Foo.dc.html` component | (not used here) | `walkComponent` `support.js:566` |
| `<helmet>…</helmet>` | inject `<link>/<meta>/<style>/<script>` into `<head>` | put in document head / global CSS | `helmet.ts` `support.js:1240` |
| `hint-placeholder-*`, `hint-size` | **streaming-only** placeholder hints | **ignore** — no runtime effect once data is present | `walkFor/walkIf` |

`sc-if`/`sc-for` **do not create DOM** — they are control-flow only. Nested `sc-for` (tally marks, kanban columns→cards) just nests `.map`.

### 1.4 Expression language (`resolve`, `support.js:203`)

The interpolation language is **deliberately tiny**. It supports only:

- identifiers and member access: `a`, `a.b.c`, `a[b]`, `a[0]`
- literals: numbers, `'str'`/`"str"`, `true`, `false`, `null`, `undefined`
- unary not: `!x`
- equality: `===`, `!==`, `==`, `!=`
- parentheses: `( … )`

It has **no** arithmetic, ternary, function-call, `&&`/`||`, or property methods. So all real computation happens in `renderVals()`; the template only reads pre-computed keys. When you see `{{ false }}` / `{{ true }}` inside a `hint-placeholder-val` those are just literals for the streaming placeholder and can be dropped.

Unresolved `{{x}}` renders empty (and warns); it never throws.

### 1.5 Attribute & style handling (critical for a faithful port)

From `collectProps`/`walkElement` (`support.js:384`, `688`):

- `class` → `className`, `for` → `htmlFor`.
- `onclick/onchange/oninput/onsubmit/onkeydown/...` → React `onClick/onChange/...` (map at `support.js:315`). Handler value comes from `{{fn}}` in vals.
- **`style="a:b;c:d"` string is parsed to a style object** (`cssToObj`, camelCased, `--vars` preserved). In these files virtually all styling is **inline `style="…"`** strings.
- **`style-hover="…"`, `style-focus="…"`, `style-before/after="…"`** are compiled to a generated CSS class with a `:hover` / `:focus` / `::before` rule (`pseudo.ts` `support.js:1350`; collected at `support.js:397`). **These are pervasive** (hover row highlight, button lift, tab underline). When porting to React you must reproduce them as real CSS `:hover`/`:focus` rules (e.g. CSS modules / styled) — you cannot express them with an inline style object.
- Controlled inputs: `value`/`checked` that resolve to `undefined` are coerced to `""`/`false` (`support.js:703`), so inputs are always controlled.
- `checked="{{fa.on}}"` on a checkbox binds a boolean; `onChange="{{fa.toggle}}"`.

### 1.6 `<helmet>`, atomic CSS, props metadata

- **`<helmet data-dc-atomics>`** injects an atomic-CSS sheet (`ATOMIC_CSS`, `support.js:1231`): `.fx/.col/.grid/.ac/.jc/.jb/.f1/.noshrink/.wrap/.fw5-8/.fs11-22/.upper/.tc/.nowrap/.gap8-24/.m0/.mt8-16/.mb8-16/.posrel/.posabs/.round/.ohide/.bbox/.pointer/.w100/.b0`. The PaperTrack designs mostly use inline styles and rarely lean on these, but they are available.
- **`<meta name="design_doc_mode" content="canvas">`** (Redesign file) switches the runtime into "canvas" mode and paints a canvas background (`CANVAS_BG_LIGHT=#f0eee6`, `CANVAS_BG_DARK=#2e2c26`, `support.js:1238`). For a real app you can ignore this (it is a design-surface affordance).
- **`data-props="{…}"`** on the logic script is the **editable-prop schema**. Keys starting with `$` are meta (`$preview`). Each prop entry has `{editor, default, tsType, section, description, options?}`. The runtime seeds the root component with the `default` values (`support.js:183`). Port these as React props with defaults:
  - **main** `PaperTrack.dc.html`: `avatarStyle="notionists"`, `motion=true`, `showNote=true`, `defaultView="kanban"`.
  - **v1**: `motion=true`, `showNote=true`, `defaultView="ledger"` (enum ledger|kanban).
  - **Unlock**: `password="papertrack"` (+ `showHint`, `hintText`, `redirectTo="PaperTrack.dc.html"`).

`motion` gates CSS entrance animations; `showNote` toggles the washi sticky-note on the dashboard; `avatarStyle` selects a DiceBear avatar style (main only, `_avatar`, `support.js`-side is none — it's `https://api.dicebear.com/9.x/<style>/svg?seed=<name>`).

### 1.7 Helpers/formatters the designs rely on — NOT in support.js

Important: **`support.js` contains no currency/date/domain formatters.** All of these live inside the `Component` logic in each `.dc.html` and must be reimplemented. The canonical set (from v1 `PaperTrack v1.dc.html:768-795` and main):

```js
_PIPE()   // status pipeline array (see §4)
_SC()     // status → hex color map (see §4)
_sheet(status)  // 'Từ chối'→'rejected'; PIPE index 0..4 → 'inprocess'; else 'finished'
_pad(n)   // 2-digit zero-pad
_fmtD(iso)      // "2026-07-15" → "15.07.2026";  falsy → "—"
_daysTo(iso)    // Math.ceil((new Date(iso+'T23:59:59') - now)/86400000)
_money(n)       // vi-VN currency, see §4
_moneySplit(n)  // {v, u} split value/unit for big numerals
_initials(name) // "Bui Thanh Khoa" → "B.T. Khoa"
_tally(count)   // group into rows of 5 tally sticks (4 sticks + diagonal strike)
_total(paper)   // costs.apc + costs.conf + costs.other
_catOf(rank[,type]) // rank → rewardCategory (see §4 — main version does free-form mapping)
```

Date locale strings use `toLocaleDateString('vi-VN', {weekday,day,month,year})` (title-cased first letter). Money uses `toLocaleString('vi-VN')`. The "frozen timeline" `componentDidMount` blocks in every file just force-finish CSS animations for capture environments — **safe to drop** in a real React app.

---

## 2. DATA SHAPE (`papertrack-data.js`)

`export const DEFAULT_DB` with `v: 3` and six collections:

```
papers: 150 | journals: 92 | conferences: 43 | specialIssues: 0 (empty!) | authors: 50 | rewardCategories: 23
```

### 2.1 `papers[]` — real record is richer than the designs consume

Every record has these keys (all 150 present):

```jsonc
{
  "id": 1,
  "title": "Portfolio selection using multi-objective optimization",
  "type": "Tạp chí",              // enum: "Tạp chí" (64) | "Hội thảo" (86)
  "venue": "Engineering Economics",
  "rank": "Q2, SSCI",            // FREE-FORM string, not an abbr (see §2.8)
  "status": "Đánh giá lại",       // see status distribution below
  "date": "2024-12-23",          // ISO submit date
  "authors": ["Tran Trong Huynh","Bui Thanh Khoa"],  // array of NAME strings
  "costs": { "apc": 0, "conf": 0, "other": 0 },       // legacy simple cost model
  "note": "",
  "doi": "",
  // ---- extra real fields the v1/Redesign designs ignore: ----
  "link": "https://…submission/39921",   // editor/submission portal URL
  "publink": "",                          // published URL
  "localpath": "E:\\Paper\\0. Dang thuc hien\\…",  // Windows file path
  "role": "Tác giả liên hệ",   // author role (see enum below)
  "payment": "Chưa trả"        // "Chưa trả"|"Chưa phí"|"Đã trả"|""
}
```

**Two additional optional fields appear on some records** (the main app uses these; v1 does not):
- **`apcEntries[]`** (19 papers): `{ desc, payer, amount, status }` — itemized APC line items; `status` values include `"Đã trả"`, `"Chưa trả"`. `amount` is a **string**.
- **`fin`** (20 papers): `{ shares: { <authorName>: <signedNumber> }, paid?: {...} }` — per-author internal cost/reward split (negative = the author owes a share of cost). One record also has `fin.paid`.

Status distribution (real): `Công bố 65, Chờ công bố 39, Nộp bài 15, Từ chối 9, Đang phản biện 7, Chấp nhận 7, Đánh giá lại 3, Xét khen thưởng 3, Chỉnh sửa 2`.
`role` distribution: `Tác giả liên hệ 72, Tác giả chính 31, Không đứng tên 11, Tham gia 10, "" 19, Tác giả đầu tiên 3, "Tác giả đầu tiên, Tác giả liên hệ" 3, "Tác giả chính, Tác giả liên hệ" 1`.
`rank` is highly free-form: `Scopus 68, Q4 22, Q1 12, Q3 10, Q2 7, "Q3, ESCI" 4, "Q1, ESCI" 3, "Q3, Scopus" 3, "Q3, ESCI, Q4" 3, "Q4, ESCI" 3, …` plus `"Q2, SSCI"`, `"SCIE, Q1"`, `""`, etc.
Only **18 of 150** papers have any non-zero `costs`.

### 2.2 `journals[]` (92)

```jsonc
{ "id":1, "name":"Evergreen", "rank":"Q2, Scopus", "country":"Nhật",
  "web":"https://…", "fee":"Free", "publisher":"", "issn":"", "note":"" }
```
`fee` is a **free-text string** (`"Free"`, `"150USD"`, `"1500USD"`, `""`). `country` is sometimes a publisher name (`"Emerald Group Publishing Ltd."`). `rank` is free-form like papers. `publisher`/`issn` are usually empty in seed. (The main add-journal form also references `impact`, not present in seed.)

### 2.3 `conferences[]` (43)

```jsonc
{ "id":4, "name":"…(ICAI3S 2024)", "rank":"Scopus",
  "deadline":"2024-07-30",     // ISO
  "confdate":"26,26/11",       // FREE-TEXT (not ISO): "9,10/10", "17,18/4/2025", "4.5/10/24"…
  "fee":0,                     // numeric, almost always 0 in seed
  "feeText":"USD200",          // real fee lives here as string
  "web":"", "location":"", "note":"" }
```
All 43 have `rank:"Scopus"`. Note the deadlines are mostly in the **past** (2024–2025) relative to the app's "today" (2026-07), so a deadline view built on the real seed shows them as "ĐÃ QUA / past".

### 2.4 `specialIssues[]`

**Empty (`[]`) in the seed.** The Special-Issue screen therefore renders empty against real data — all SI content shown in the designs is illustrative/hard-coded. Expected shape (from v1's add form + siRow deco): `{ id, name, journal, rank, deadline (ISO), type }` where `type` defaults to `"Special Issue"` (also `"Book Chapter"`).

### 2.5 `authors[]` (50)

```jsonc
{ "id":1, "name":"Bui Thanh Khoa", "unit":"IUH", "title":"", "email":"",
  "bank":"", "note":"125 bài" }
```
`unit`: mostly `""` (39), `"IUH"` (10), `"FU"` (1). `title` = academic title (TS./PGS. TS.), usually empty in seed. `bank` = bank account (used by main finance screen), empty in seed. `note` often holds a paper count string. **Papers link to authors only by matching `paper.authors[]` string against `author.name`** — there is no id foreign key.

### 2.6 `rewardCategories[]` (23) — see §4 for the verbatim table

```jsonc
{ "id":1, "name":"Bài báo WoS (SCIE/SSCI/A&HCI) Q1",
  "abbr":"WoS-Q1", "group":"WoS (SCIE/SSCI/A&HCI)", "amount":150480000 }
```
One record (`IUH`) also carries an `issn` field. `group` is the reward-screen section header.

### 2.7 How the DB differs from the "JSON export" schema

The in-app JSON export/import (v1 `exportJson`/`importFile`) round-trips exactly these six collections: `{papers, journals, conferences, specialIssues, authors, rewardCategories}`. Import tolerates missing collections (defaults each to `[]`, keeps existing `rewardCategories` if absent). So the **export schema == DEFAULT_DB schema**, with the caveat that computed fields below are **not** stored.

### 2.8 Design-vs-data mismatches (must handle on reimplementation)

1. **`rank` mismatch.** v1's `_catOf(rank)` and `rankGroups`/`tallyRows` assume `rank` equals a reward **abbr** (`"WoS-Q1"`, `"Sco-Q2"`). Real ranks are free-form (`"Q1"`, `"Scopus"`, `"Q2, SSCI"`). **Only 2 of 150** real papers' rank equals an abbr. → The **main** file fixes this with a proper mapper `_catOf(rank, type)` (see §4); **use the main version.** v1's reward/tally numbers would be near-zero on real data.
2. **Conference `fee` vs `feeText`.** Real numeric `fee` is 0; the real amount is the string `feeText`. v1 only reads `fee`, so it shows no fee. Read `feeText` (or parse it).
3. **`confdate` is free text**, not ISO — do not feed it to `Date()`.
4. **`apcEntries`/`fin`** exist in seed but are only consumed by the **main** app's finance screen; v1/Redesign silently ignore them.
5. **`specialIssues` is empty** — the SI screen is data-driven and will be empty unless seeded.
6. Derived/precomputed fields the logic adds at render time (never stored): `sheet`, `statusColor`, `dateF`, `rankT`, `authorsShort`; dashboard aggregates (`published`, `q1/q2`, `rewardEst`, `spent`); per-author `nPapers/q12/reward`.

---

## 3. VARIANT SCREENS (what each file adds / differs)

### 3.1 `PaperTrack.dc.html` — the canonical superset

Screens (`data-screen-label`): **Tổng quan** (dashboard), **Sổ theo dõi bài báo** (papers, ledger+kanban), **Tạp chí**, **Hội thảo**, **Special Issue**, **Tác giả**, **Thu chi nội bộ** (internal settlement — NEW), **Chi phí**, **Khen thưởng**, **Thông báo**, **Dữ liệu**, plus overlays: **Hồ sơ bài báo** (detail panel), **Hồ sơ danh mục** (catalog detail panel — NEW), **Biểu mẫu bài báo** (paper modal), **Biểu mẫu danh mục** (catalog modal), **Masthead**.

Distinctive features beyond v1:
- **Grouped/nested navigation.** `state.page` plus grouped tabs with children and badges, e.g. a **"Tài chính"** parent → children `['settle'→"Thu chi nội bộ", 'costs'→"Sổ chi phí", 'rewards'→"Khen thưởng"]` (`PaperTrack.dc.html:1582`). Nav resets pagination on switch.
- **Internal finance / settlement screen ("Sổ thu chi nội bộ", `:536`).** Built from `apcEntries` + `fin.shares`/`fin.paid` + `fin.rewardReceived`. It computes who owes/receives money (APC contributions and reward splits), lets you **record partial/full payments** (`t.fin.paid[name] = {amount, date}`) and mark **reward received** (`t.fin.rewardReceived`). Notifications feed off it ("THU TIỀN"/"CHI TRẢ"). This is the main reason `apcEntries`/`fin` exist in the data.
- **Catalog detail panel** (`csel` state, "Hồ sơ danh mục") — click a journal/conference/author to open a side panel; v1 has no catalog detail.
- **Pagination** across lists (`ppage/jpage/cpage/spage`).
- **`_catOf(rank, type)` free-form rank mapper** (§4) — correct reward classification on real data.
- **Avatars** via `avatarStyle` prop (DiceBear).
- **Notification setting toggles** (`nsToggles`: `deadline/remind/money/watch`) — user-controllable reminder categories.
- **Spreadsheet-style export** building multiple named sheets, including a "Thu chi nội bộ" sheet (`:2060`) with columns `["Bài báo","Tác giả","Phần chia (₫)","Đã ghi (₫)","Ngày ghi","Còn lại (₫)","Trạng thái"]`.
- Fonts: **Spectral, Instrument Serif, IBM Plex Mono, Dancing Script**; extra keyframes `ptPage/ptTabIn/ptChildIn`.

### 3.2 `PaperTrack v1.dc.html` — earlier full app (best reference for core logic)

Same core screens as main **except**: no finance-settlement screen, no catalog detail panel, no pagination, no avatars, no reminder-toggles, simpler `_catOf(rank)` (abbr-only). Cost model is the flat `costs:{apc,conf,other}` only. Its `renderVals()` (`:797-1090`) is fully self-contained and the clearest single spec of the app's behavior. Screens present:

- **Dashboard** (`isDashboard`): giant total numeral, published/Q1-Q2/reward-est/spent stat grid, a rotated **"ĐÃ KIỂM KÊ" wax-seal stamp**, an optional **washi sticky note** (`showNote`), Section I **pipeline funnel** (5 stages with animated bars), Section II **in-process ledger** (first 5), Section III **upcoming deadlines timeline** (dashed thread + rotated day-count discs), Section IV **tally-by-rank** (hand-drawn tally sticks).
- **Papers** (`isPapers`, pages `inprocess/finished/rejected/all`): search input, status filter chips, **Ledger view** (`viewLedger`) and **Kanban view** (`viewKanban`, per-status columns of rotated cards). Kanban disabled on the `all` page.
- **Journals** (`isJournals`): Q1–Q4 filter, search, table `№|name—publisher|rank|country|used(count)`, add-journal modal.
- **Conferences** (`isConfs`): deadline-sorted timeline with day-count discs (urgent/warn/past coloring), fee text, add modal.
- **Special Issues** (`isSIs`): deadline timeline; add modal.
- **Authors** (`isAuthors`): table `№|name—unit|tally of papers|Q1/Q2 count|estimated reward` (reward split evenly across a paper's authors), add modal.
- **Costs** (`isCosts`): table `№|paper|APC|conf|other|total` + grand total row.
- **Rewards** (`isRewards`): reward table grouped by `rewardCategories.group`, showing `abbr | name | amount (vi-VN)`.
- **Notifications** (`isNotifs`): three computed sections — **Khẩn (≤15 ngày)**, **Nhắc việc** (accepted-papers + deadlines 16–30d), **Theo dõi** (papers in review > 75 days).
- **Data** (`isData`): inventory counts + **Export JSON / Import JSON / Reset sample / Clear all** actions (double-confirm on clear).
- **Overlays:** right **detail panel** (advance-status / reject / restore / edit / delete, author list, reward, cost breakdown, note, DOI), **paper modal** (full add/edit form with author checkboxes, venue `<datalist>` autocomplete, rank `<select>` from reward abbrs with live reward hint), **generic catalog modal** (journal/conf/si/author field-driven forms), and a **toast**.

### 3.3 `PaperTrack Redesign.dc.html` — static visual study

A **single hard-coded dashboard** (design-review "option 2a", theme "Xưởng giấy" = paper workshop). **No data binding, no state, no interactivity** — `renderVals(){return {}}` and only the frozen-timeline animation helper. It is wrapped in a design-review chrome (`.dv-turn/.dv-opt/.dv-card` at 1320px) and rendered in **canvas mode**. It explores a heavier "atelier" treatment of the same dashboard: fiber-grain paper gradient, red wax **"ĐÃ KIỂM KÊ" seal**, tally counting by rank, washi sticky note, Roman-numeral section headers, hand-annotation accents ("kỷ lục!", "gấp!"), and rich entrance keyframes (`ptUp/ptInk/ptDraw/ptFade/ptStamp`). Fonts: **Newsreader, IBM Plex Mono, Schibsted Grotesk, Space Grotesk, Patrick Hand**. Nothing here is a new *feature* — it is an alternate aesthetic for the dashboard; use it for visual direction, not logic.

### 3.4 `PaperTrack Unlock.dc.html` — passcode gate

A standalone **login/unlock splash** ("Mở khóa", labeled confidential — "MẬT" watermark, "lưu hành nội bộ"). State `{pw, show, error, attempts, unlocking, unlocked}`. Compares `pw` to prop `password` (default `"papertrack"`), shows/hides input (`inputType` password/text), shake animation on wrong attempts, and on success sets `unlocked` then **redirects to `redirectTo` (default `PaperTrack.dc.html`)**. Props: `password`, `showHint`, `hintText` ("tên của sổ, viết thường"), `redirectTo`. This is an optional front gate, not part of the app data model.

---

## 4. CONSTANTS WORTH REUSING VERBATIM

**Status pipeline** (order matters — index drives sheet bucket & "advance" button):
```js
const PIPE = ['Nộp bài','Đang phản biện','Chỉnh sửa','Đánh giá lại','Chấp nhận',
              'Chờ công bố','Công bố','Xét khen thưởng'];   // + 'Từ chối' (terminal, off-pipeline)
```
Sheet bucketing: `'Từ chối' → rejected`; PIPE index 0–4 → `inprocess`; index 5–7 → `finished`.
"Published" = status `'Công bố'` or `'Xét khen thưởng'`. Reward is counted only when `PIPE.indexOf(status) >= 4` (i.e. Chấp nhận onward).

**Status → color map** (`_SC`):
```js
{
  'Nộp bài':        '#2B5C9E',
  'Đang phản biện': '#5C4EA8',
  'Chỉnh sửa':      '#B4691E',
  'Đánh giá lại':   '#A3382B',
  'Chấp nhận':      '#5A6E3A',
  'Chờ công bố':    '#77705F',
  'Công bố':        '#3E6E45',
  'Xét khen thưởng':'#8A6D1F',
  'Từ chối':        '#A3382B'
}
```

**Rank grouping for tally** (`rankGroups`, v1 — abbr-based, largely inert on real data):
```js
[['WoS-Q1', r=>r==='WoS-Q1'], ['WoS-Q2', r=>r==='WoS-Q2'],
 ['Scopus', r=>(r||'').indexOf('Sco')===0],
 ['Khác',   r=> r!=='WoS-Q1'&&r!=='WoS-Q2'&&(r||'').indexOf('Sco')!==0]]
```

**Free-form rank → reward category** (`_catOf(rank, type)`, main — use THIS on real data):
```js
_catOf(rank, type) {
  const rcs = db.rewardCategories;
  if (!rank) return null;
  const hit = rcs.find(r => r.abbr === rank);        // exact abbr match first
  if (hit) return hit;
  const t = String(rank).toUpperCase();
  const qm = t.match(/Q([1-4])/);
  let abbr = '';
  if (type === 'Hội thảo')          abbr = (t.includes('SCOPUS')||qm) ? 'KY-Sco' : 'KY-QT';
  else if (/SSCI|SCIE|A&HCI/.test(t)) abbr = qm ? 'WoS-Q'+qm[1] : 'WoS-NR';
  else if (qm)                       abbr = 'Sco-Q'+qm[1];
  else if (t.includes('ESCI'))       abbr = 'ESCI';
  else if (t.includes('SCOPUS'))     abbr = 'Sco-NR';
  return rcs.find(r => r.abbr === abbr) || null;
}
```

**Reward table** (`rewardCategories`, verbatim — `abbr | amount ₫ | group`):

| abbr | amount (₫) | group | name |
|---|---:|---|---|
| WoS-Q1 | 150,480,000 | WoS (SCIE/SSCI/A&HCI) | Bài báo WoS Q1 |
| WoS-Q2 | 110,880,000 | WoS (SCIE/SSCI/A&HCI) | Bài báo WoS Q2 |
| WoS-Q3 | 80,400,000 | WoS (SCIE/SSCI/A&HCI) | Bài báo WoS Q3 |
| WoS-Q4 | 60,000,000 | WoS (SCIE/SSCI/A&HCI) | Bài báo WoS Q4 |
| WoS-NR | 25,200,000 | WoS (SCIE/SSCI/A&HCI) | WoS chưa phân hạng |
| Sco-Q1 | 90,000,000 | Scopus | Bài báo Scopus Q1 |
| Sco-Q2 | 70,200,000 | Scopus | Bài báo Scopus Q2 |
| Sco-Q3 | 50,400,000 | Scopus | Bài báo Scopus Q3 |
| Sco-Q4 | 20,160,000 | Scopus | Bài báo Scopus Q4 |
| Sco-NR | 16,800,000 | Scopus | Scopus chưa phân hạng |
| ESCI | 16,800,000 | ESCI/CPCI | Bài báo ESCI/CPCI |
| KY-Sco | 12,600,000 | Hội thảo / Kỷ yếu | Kỷ yếu HNKH danh mục Scopus |
| KY-QT | 5,850,000 | Hội thảo / Kỷ yếu | Bài toàn văn HNKH quốc tế (ISSN/ISBN) |
| KY-VN | 1,800,000 | Hội thảo / Kỷ yếu | Bài toàn văn HNKH trong nước |
| TC-ISSN | 2,100,000 | Tạp chí trong nước & khác | Tạp chí quốc tế khác (ISSN) |
| IUH | 5,850,000 | Tạp chí trong nước & khác | Tạp chí KHCN IUH (issn 2525-2267) |
| TC-VN | 1,800,000 | Tạp chí trong nước & khác | Tạp chí trong nước khác (ISSN) |
| CS-QT | 25,500,000 | Chương sách | Chương sách quốc tế NXB uy tín |
| SC-QT | 100,800,000 | Sở hữu trí tuệ | Bằng độc quyền sáng chế quốc tế |
| SC-VN | 60,000,000 | Sở hữu trí tuệ | Bằng độc quyền sáng chế trong nước |
| GP-HI | 28,800,000 | Sở hữu trí tuệ | Bằng độc quyền giải pháp hữu ích |
| KDCN | 14,400,000 | Sở hữu trí tuệ | Thiết kế mạch, kiểu dáng công nghiệp |
| QTG | 4,800,000 | Sở hữu trí tuệ | Giấy chứng nhận đăng ký quyền tác giả |

Group display order (from seed): `WoS (SCIE/SSCI/A&HCI)` → `Scopus` → `ESCI/CPCI` → `Hội thảo / Kỷ yếu` → `Tạp chí trong nước & khác` → `Chương sách` → `Sở hữu trí tuệ`. **Reward is split evenly across a paper's authors** (`amount / max(authors.length,1)`).

**Money formatter** (`_money` / `_moneySplit`, vi-VN):
```js
_money(n){ if(!n) return '0 ₫';
  if(n>=1e9) return (n/1e9).toFixed(2).replace('.',',')+' tỷ ₫';
  if(n>=1e6) return (n/1e6).toFixed(1).replace('.',',').replace(',0','')+' tr ₫';
  return n.toLocaleString('vi-VN')+' ₫'; }
_moneySplit(n){ // returns {v,u} for big-numeral display
  if(n>=1e9) return {v:(n/1e9).toFixed(2).replace('.',','), u:'tỷ ₫'};
  if(n>=1e6) return {v:(n/1e6).toFixed(1).replace('.',',').replace(',0',''), u:'tr ₫'};
  return {v:String(Math.round(n/1000)), u:'k ₫'}; }
```

**Date formatter**: `_fmtD("2026-07-15") → "15.07.2026"` (dots, day.month.year); falsy → `"—"`. `_daysTo(iso)` = ceil-days until `iso T23:59:59`.

**Column orders** (ledger tables):
- Papers ledger: `№ | Bài báo — tạp chí/hội thảo | Tiến độ(status) | Hạng | Tác giả | Ngày nộp`.
- Journals: `№ | Tạp chí — nhà xuất bản | Hạng | Quốc gia | Bài đã gửi`.
- Authors: `№ | Tác giả — đơn vị | Kiểm đếm bài(tally) | Q1/Q2 | Khen thưởng ước tính`.
- Costs: `№ | Bài báo | APC | Hội nghị | Hiệu đính/khác | Tổng` (+ grand total).
- Finance sheet (main): `Bài báo | Tác giả | Phần chia (₫) | Đã ghi (₫) | Ngày ghi | Còn lại (₫) | Trạng thái`.

**Deadline-disc coloring** (shared conf/SI/deadline logic): `urgent = days<=15`, `warn = days<=30`, `past = days<0`. Urgent → solid red `#A3382B` fill on cream `#F5F1E6`; warn → red border; past → muted `#B0A890`/`#C9C2B2`, opacity `.55`, glyph `✓`+"ĐÃ QUA".

**Key Vietnamese label map** (page/nav):
`Tổng quan`=dashboard, `Đang xử lý`=in-process, `Hoàn thành`=finished, `Từ chối`=rejected, `Tất cả`=all, `Tạp chí`=journals, `Hội thảo`=conferences, `Special Issue`=special issues, `Tác giả`=authors, `Chi phí`=costs, `Khen thưởng`=rewards, `Thông báo`=notifications, `Dữ liệu`=data, `Thu chi nội bộ`=internal settlement (main only). Field labels: `Tên bài báo`, `Loại`, `Tiến độ`(status), `Ngày nộp`, `Tạp chí / Hội thảo`, `Phân loại`(rank), `Tác giả tham gia`, `APC (₫)`, `Phí hội nghị (₫)`, `Hiệu đính / khác (₫)`, `Ghi chú`, `DOI`. Toasts/confirms are Vietnamese (e.g. "Đã ghi vào sổ", "Đã chuyển sang …", "Đã xóa hồ sơ").

**Brand palette** (recurring hexes): ink `#221D14`, paper `#F5F1E6`/`#FBF7EC`, accent red `#A3382B`, muted `#77705F`/`#B0A890`, rules `#D8D0BC`/`#DDD6C6`/`#E5DFCE`, chip bg `#EAE3D0`, gold `#8A7A4A`/`#C9B36A` (washi tape). Persistence key: `localStorage['papertrack2.db']`; seed via `import('./papertrack-data.js').DEFAULT_DB`.