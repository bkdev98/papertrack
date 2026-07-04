I have everything I need — full source plus the real companion data export. Here is the exhaustive spec.

---

# PaperTrack — Complete Feature, Data-Model & Business-Logic Specification

Source of truth: `/Users/quocs/Downloads/papertrack.html` (single-file HTML/CSS/JS app, ~4464 lines). Companion export analyzed: `/Users/quocs/Downloads/papertrack-data-20260525.json` (150 papers, 50 authors, 92 journals, 43 conferences, 0 special issues). All numbers, formulas, and enum strings below are quoted verbatim from the code. UI language is Vietnamese.

> Conventions in this doc: Vietnamese status/role strings are the actual stored values (do not translate them in the DB). "đ" = Vietnamese đồng. Money is formatted `Intl.NumberFormat('vi-VN')` + `"đ"`.

---

## 0. Global architecture & invariants

- **Single-page app**, no backend. All state in a JS object `DB` mirrored to `localStorage`.
- **`DB` shape**: `{ papers:[], journals:[], conferences:[], authors:[], specialIssues:[], rewardCategories:[] }`.
- **No auth / no password gate** anywhere. No login screen, no server calls except an optional `fetch('papertrack-data.json')` for "load sample data".
- **IDs** are integers, assigned per-collection as `(Math.max(0, ...ids) || 0) + 1`. IDs are unique only within their own array.
- **Boot sequence** (`window load`): `loadFromLocalStorage()` → `loadNotifSettings()` → `checkNotifications(true)` → `setInterval(checkNotifications, 3600000)` (hourly) → `renderAll()`.
- **Persistence contract**: every mutating action calls `persist()` = `localStorage.setItem('pt_db', JSON.stringify(DB))` then `renderAll()`. `unsaved` flag is separate and only means "not yet exported to a file".

---

## 1. FEATURE INVENTORY (screens/views)

Navigation is a fixed left sidebar. `nav(page, el)` sets `currentPage`, resets search + filter, updates the page title, toggles the paper/catalog view switchers, and rebinds the top-bar "+ Add" button per page. Top bar has: global search, view toggle(s), a notification bell with dropdown, and the context add button.

Sidebar sections & pages:

**Tổng quan (Overview)**
1. **Dashboard** (`renderDashboard`)
   - 4 stat cards: **Tổng bài báo** (total papers) + "N đang xử lý"; **Đã xuất bản** (published) + "X% thành công"; **Q1 / Q2** (q1+q2) + breakdown; **Tổng chi phí** (grand total cost over all papers).
   - Urgent-notification red banner (if any `urgent` notifications) linking to notifications page.
   - Bar chart "Phân bổ theo tiến độ" over the 5 in-process statuses (`KCOLS`).
   - "Theo xếp hạng" legend bars for Q1/Q2/Q3/Scopus with % of (q1+q2+q3+sc).
   - "⏰ Hạn nộp sắp tới (60 ngày)" cards: merges upcoming conferences + special issues with deadline in `[0,60]` days, sorted ascending, top 6.
   - "Bài báo đang xử lý": first 6 papers with `sheet==='inprocess'` as cards.
2. **Thông báo (Notifications page)** (`renderNotificationsPage`) — summary cards (urgent/warn/info counts), refresh + clear-all buttons, three grouped lists (🔴 urgent / 🟠 warn / 🔵 info), each dismissable; settings shortcut.

**Bài báo (Papers)** — all share the Kanban/Table view toggle:
3. **Đang xử lý (In-process)** — filter `sheet==='inprocess' || status==='Chấp nhận'`.
4. **Hoàn thành (Finished)** — filter `sheet==='finished' || status==='Chấp nhận'`.
5. **Từ chối (Rejected)** — filter `sheet==='rejected'`.
6. **Tất cả bài báo (All papers)** — no sheet filter.

**Danh mục (Catalog)** — each has a catalog view toggle:
7. **Tạp chí (Journals)** (`renderJournals`) — views: **card / table / timeline** (timeline groups by Q1/Q2/Q3/Q4-&-other tiers). Rank filter tags Q1–Q4 + All. Per-journal computed: #papers, #published, #in-process.
8. **Hội thảo (Conferences)** (`renderConferences`) — views: **card / table / timeline** (timeline = "with deadline" list + "no deadline" grid). Filter tags: **⏰ Sắp hết hạn** (default; deadline in `[0,60]` days) and **Tất cả**. Deadline countdown badges.
9. **Special Issue / Book Chapter** (`renderSpecialIssues`) — views: **card / table / timeline**. Filter tags: **⏰ Sắp hết hạn** / **Tất cả**. Types: Special Issue / Book Chapter / Call for Papers.
10. **Tác giả (Authors)** (`renderAuthors`) — views: **card (🪪) / table (▤) / stats (📊)**. Includes "🔀 Gộp" (merge authors) tool. Per-author computed financials (reward + APC owed/paid/remaining).

**Danh mục (second section)**
11. **Chi phí (Costs / TÀI CHÍNH)** (`renderCosts`) — views: **bypaper (📄) / byauthor (👥) / summary (📊)**. See §7.
12. **Danh mục khen thưởng (Reward categories)** (`renderRewardCats`) — grouped rate table, CRUD, reset-to-default.

**Dữ liệu (Data)**
13. **Import / Export** (`renderDataPage`) — export JSON / CSV / Excel-workbook, import (merge/replace), load sample, notification-settings summary, reset-dismissed, nuke-all.

Overlays/panels (not nav pages): **Paper detail slide-over panel** (`openDetail`), **Paper modal** (3 tabs), Journal/Conference/Author/SpecialIssue/RewardCategory modals, **Import modal**, **Notification-settings modal**, **Duplicate-warning modal**, **Merge-authors modal**, **Toasts**.

Sidebar footer mini-stats (`updateMiniStats`): **Bài Q1** = non-rejected papers with rank containing "Q1"; **Xuất bản** = `status==='Publication'`; **Tạp chí** count; **Tác giả** count.

Sidebar nav badges (`updateBadges`): `nb-ip`=sheet inprocess, `nb-fi`=sheet finished, `nb-rj`=sheet rejected, `nb-jn`=journals, `nb-cf`=conferences, `nb-si`=specialIssues, `nb-rc`=rewardCategories, `nb-au`=authors, `nb-notif`=live notification count.

---

## 2. DATA MODEL

### 2.1 `papers[]`
Fields (all present in real export): `id`, `title`, `type`, `journal`, `venueId`, `rank`, `status`, `date`, `authors`, `role`, `payment`, `link`, `publink`, `localpath`, `note`, `sheet`, `costEntries[]`, `apcEntries[]`. (Legacy field `totalCost` is read as a fallback but never written by current code.)

| Field | Type | Semantics |
|---|---|---|
| `id` | int | unique within papers |
| `title` | string | paper title (required) |
| `type` | enum | **`Tạp chí`** (journal) or **`Hội thảo`** (conference). Drives which catalog the venue search reads and which venue collection it links to. |
| `journal` | string | display name of the venue (journal OR conference name). Stored even for conferences. Also used as fallback venue-link key. |
| `venueId` | int\|null | FK to `journals[].id` (if type=Tạp chí) or `conferences[].id` (if type=Hội thảo). Set when a venue is chosen from the search dropdown; null if free-typed. |
| `rank` | string | classification tag(s), e.g. `Q1`, `Q4`, `Scopus`, or comma lists like `"Q2, ESCI"`, `"Q3, Q4"`. Free-form but typically the `abbr` of a reward category. Matched via substring `.includes()`. |
| `status` | enum | pipeline status — see §2.6. |
| `date` | string | **submission date "Ngày nộp"**, stored as **`d/m/yyyy`** (no zero-pad), e.g. `"10/7/2025"`. Note: differs from deadline storage format. |
| `authors` | string | comma-joined author display names, e.g. `"Le Quoc Kiet, Nguyen Thi Tuyet Thanh"`. Derived from selected authors on save (falls back to `journal` if none). |
| `role` | string | paper-level role label (free/legacy). Real data holds values like `Tác giả liên hệ`, `Tác giả chính`, `Không đứng tên`, and even comma combos. Per-author roles live in `costEntries`. |
| `payment` | enum | card-level payment summary — see §2.5. |
| `link` | url | submission link |
| `publink` | url | published-article link |
| `localpath` | string | local file path (e.g. `E:\Paper\...`) |
| `note` | string | free text |
| `sheet` | enum | **derived bucket**: `inprocess` \| `finished` \| `rejected` — see §2.7. |
| `costEntries[]` | array | reward ("khen thưởng") allocation per author — see §2.8. |
| `apcEntries[]` | array | APC / conference-fee entries — see §2.9. |

### 2.2 `journals[]`
`{ id, name, rank, country, web, fee, time, note }`
- `rank`: classification (Q1..Q4/ESCI/Scopus, comma-separable). `country`: country or publisher (e.g. "USA", "Springer"). `fee`: free text (`"Free"`, `"1500 USD"`). `time`: review duration free text (`"3–6 tháng"`). `web`: URL.

### 2.3 `conferences[]`
`{ id, name, rank, deadline, confdate, fee, web, note }`
- `deadline`: **ISO `yyyy-mm-dd`** (from `<input type=date>`) — submission deadline. `confdate`: free-text event date string (e.g. `"15-17/12/2026"`). `fee`: free text. In real data all 43 confs have rank `"Scopus"`.

### 2.4 `specialIssues[]`
`{ id, name, journal, type, rank, deadline, editor, link, note }`
- `type` enum: **`Special Issue`** \| **`Book Chapter`** \| **`Call for Papers`** (default Special Issue). `deadline`: ISO date. `editor`: guest editor. `journal`: journal/publisher name.

### 2.5 `authors[]`
`{ id, name, email, org, role, bank, note }`
- `role` (default/"Vai trò thường gặp") enum in form: `Tác giả chính` \| `Tác giả đầu tiên` \| `Tác giả liên hệ` \| `Tham gia` \| `""`. Used only to pre-fill an author's role when added to a paper. `bank`: bank account for reward payout. In the real export all 50 authors have `role=""`.

### 2.6 `rewardCategories[]` (seeded from code defaults; not in export)
`{ id, name, abbr, group, amount, note }` — the reward rate table (§3.1). `group` enum: `WoS (SCIE/SSCI/A&HCI)` \| `Scopus` \| `ESCI/CPCI` \| `Hội thảo/Kỷ yếu` \| `Tạp chí trong nước` \| `Chương sách` \| `Sở hữu trí tuệ` \| `Khác`. `amount` is an integer đồng.

### 2.7 Status vocabulary, ordering & pipeline

`STATUS_MAP` (status → CSS class + short label):

| status (stored) | short label | bucket group (in the `<select>`) |
|---|---|---|
| `Nộp bài` | Nộp bài | Đang xử lý |
| `Đang phản biện` | Phản biện | Đang xử lý |
| `Chỉnh sửa` | Chỉnh sửa | Đang xử lý |
| `Đánh giá lại` | Đánh giá lại | Đang xử lý |
| `Chấp nhận` | Chấp nhận | Hoàn thành (also last in-process step) |
| `Chờ công bố` | Chờ công bố | Hoàn thành |
| `Công bố` | Công bố | Hoàn thành |
| `Xét khen thưởng` | Xét khen thưởng | Hoàn thành |
| `Rejected` | Rejected | Khác |
| `Publication` (legacy) | Công bố | — alias |
| `Đang chờ công bố` (legacy) | Chờ công bố | — alias |

**In-process pipeline** `KCOLS` (kanban column order): `Nộp bài → Đang phản biện → Chỉnh sửa → Đánh giá lại → Chấp nhận`.
**Finished pipeline** `FCOLS`: `Chấp nhận → Chờ công bố → Công bố → Xét khen thưởng`. (`Chấp nhận` appears in BOTH pipelines as the hinge.)
**`FINISHED_STATUSES`** = `['Chờ công bố','Công bố','Xét khen thưởng','Publication','Đang chờ công bố']` (used only to derive `sheet`).

> Real-data reality: statuses are dominated by legacy values — `Publication` (62) and `Đang chờ công bố` (29) — plus `Nộp bài` 12, `Chờ công bố` 10, `Rejected` 9, `Đang phản biện` 7, `Chấp nhận` 7, `Đánh giá lại` 3, `Công bố` 3, `Xét khen thưởng` 3, `Chỉnh sửa` 2, `""` 3. Any rebuild MUST treat `Publication`/`Đang chờ công bố` as first-class, not just aliases.

### 2.8 `sheet` derivation (from status)
In `_buildPaperData()` on save:
```
sheet = 'inprocess'
if FINISHED_STATUSES.includes(status)  → sheet = 'finished'
if status === 'Rejected'               → sheet = 'rejected'
```
So `Chấp nhận` yields `sheet='inprocess'` (it is NOT in FINISHED_STATUSES), yet the In-process AND Finished list views both include `status==='Chấp nhận'` via an explicit OR in `getFiltered()`. Empty/unknown status → `inprocess`. Real-data sheets: finished 111, inprocess 30, rejected 9.

### 2.9 `costEntries[]` (khen thưởng / reward per author)
Element `{ author, role, owed, paid, status }`:
- `author`: author display name (string, matches `authors` names).
- `role`: per-paper role — `Tác giả chính` \| `Tác giả đầu tiên` \| `Tác giả liên hệ` \| `Tham gia` \| `Không đứng tên` \| `""`.
- `owed`: reward amount owed to this author (string; may contain thousands separators — parsed via `parseNum`).
- `paid`: amount already paid (string).
- `status`: `Đã trả` \| `Chưa trả` \| `""`.
- Semantics: the paper's reward is split across its authors; each row is one author's share. "Còn nợ" (remaining) = `owed − paid`.

### 2.10 `apcEntries[]` (APC / conference fee)
Element `{ desc, payer, amount, status }`:
- `desc`: description, defaults to `"APC"`.
- `payer`: name of the author who pays the fee (chosen from the paper's selected authors; may not match any registered author).
- `amount`: fee amount (string).
- `status`: `Đã trả` \| `Chưa trả` \| `""`.
- Semantics: article-processing charge or conference fee. **Paid-ness is binary**: an APC counts as fully paid iff `status==='Đã trả'` (there is no partial-paid field for APC).

### 2.11 venue linking rule (papers ↔ journals/conferences)
Everywhere a venue's papers are computed:
```
papers = DB.papers.filter(p => p.type==='Tạp chí'  && (p.journal===j.name || p.venueId===j.id))   // journals
papers = DB.papers.filter(p => p.type==='Hội thảo' && (p.journal===cf.name|| p.venueId===cf.id))   // conferences
```
Link is satisfied by **either** exact `venueId` match **or** exact `journal`-name match, AND correct `type`. In the export 81/150 papers have a `venueId`; the rest link by name only.

---

## 3. BUSINESS LOGIC & COMPUTED FIELDS (exact formulas)

### 3.1 Reward rate table — `getDefaultRewardCategories()` (verbatim amounts, đồng)

| id | name | abbr | group | amount |
|---|---|---|---|---|
| 1 | Bài báo WoS (SCIE/SSCI/A&HCI) Q1 | WoS-Q1 | WoS (SCIE/SSCI/A&HCI) | **150.480.000** |
| 2 | Bài báo WoS (SCIE/SSCI/A&HCI) Q2 | WoS-Q2 | WoS | **110.880.000** |
| 3 | Bài báo WoS (SCIE/SSCI/A&HCI) Q3 | WoS-Q3 | WoS | **80.400.000** |
| 4 | Bài báo WoS (SCIE/SSCI/A&HCI) Q4 | WoS-Q4 | WoS | **60.000.000** |
| 5 | Bài báo Scopus Q1 | Sco-Q1 | Scopus | **90.000.000** |
| 6 | Bài báo Scopus Q2 | Sco-Q2 | Scopus | **70.200.000** |
| 7 | Bài báo Scopus Q3 | Sco-Q3 | Scopus | **50.400.000** |
| 8 | Bài báo Scopus Q4 | Sco-Q4 | Scopus | **20.160.000** |
| 9 | Bài báo ESCI/CPCI | ESCI | ESCI/CPCI | **16.800.000** |
| 10 | Bài báo WoS chưa phân hạng | WoS-NR | WoS | **25.200.000** |
| 11 | Bài báo Scopus chưa phân hạng | Sco-NR | Scopus | **16.800.000** |
| 12 | Kỷ yếu HNKH danh mục Scopus | KY-Sco | Hội thảo/Kỷ yếu | **12.600.000** |
| 13 | Tạp chí quốc tế khác (ISSN) | TC-ISSN | Tạp chí trong nước | **2.100.000** |
| 14 | Tạp chí KHCN IUH | IUH | Tạp chí trong nước | **5.850.000** |
| 15 | Tạp chí trong nước khác (ISSN) | TC-VN | Tạp chí trong nước | **1.800.000** |
| 16 | Bài toàn văn HNKH QT (ISSN/ISBN) | KY-QT | Hội thảo/Kỷ yếu | **5.850.000** |
| 17 | Bài toàn văn HNKH trong nước | KY-VN | Hội thảo/Kỷ yếu | **1.800.000** |
| 18 | Chương sách QT của NXB uy tín | CS-QT | Chương sách | **25.500.000** |
| 19 | Bằng độc quyền sáng chế QT | SC-QT | Sở hữu trí tuệ | **100.800.000** |
| 20 | Bằng độc quyền sáng chế trong nước | SC-VN | Sở hữu trí tuệ | **60.000.000** |
| 21 | Bằng độc quyền giải pháp hữu ích | GP-HI | Sở hữu trí tuệ | **28.800.000** |
| 22 | Thiết kế mạch, kiểu dáng công nghiệp | KDCN | Sở hữu trí tuệ | **14.400.000** |
| 23 | Giấy chứng nhận đăng ký quyền tác giả | QTG | Sở hữu trí tuệ | **4.800.000** |

Labelled "Theo Quy chế chi tiêu nội bộ 2026". Categories are fully CRUD-editable and reset-able to these defaults. The **`rank` field of a paper/journal is intended to hold one of these `abbr` values**, and the rank typeahead searches `rewardCategories` by `abbr`/`name`/`group`.

### 3.2 Reward distribution algorithm — `calcRewardsFromCategory(rcId)` (exact)
Given `totalReward = rc.amount`, `authors = selectedAuthors`, `n = authors.length`:
```
equalPart = Math.floor(totalReward * 0.4 / n)      // 40% split equally among ALL authors

if (some author has role 'Tác giả chính'):          // main-author case
    main author   → Math.floor(totalReward * 0.6) + equalPart
    every other   → equalPart
else:                                                // no main author
    role30 = Math.floor(totalReward * 0.3)
    'Tác giả đầu tiên' → role30 + equalPart
    'Tác giả liên hệ'  → role30 + equalPart
    every other        → equalPart
```
Result written to each author's `owed` (as string); `paid` left as-is. Triggered by the "🔢 Tính khen thưởng" button (`autoCalcRewards`), which requires a selected reward category (`f-reward-cat`) and ≥1 author. Interpretation: main author gets 60% + equal share of the 40% pool; otherwise first author and contact author each get an extra 30%, and the 40% pool is shared by everyone. (Role-uniqueness validation, §6, guarantees at most one of each.)

### 3.3 Per-paper cost/finance totals (exact)
```
totalApc(p)      = Σ apcEntries.amount
totalApcPaid(p)  = Σ apcEntries.amount where status==='Đã trả'
totalCost(p)     = (costEntries.length ? Σ costEntries.owed : parseNum(p.totalCost)) + totalApc(p)
totalCostPaid(p) = Σ costEntries.paid + totalApcPaid(p)
remaining(p)     = totalCost(p) − totalCostPaid(p)
```
`reward(p)` (used in detail panel) = `Σ costEntries.owed`. Grand total on Dashboard = `Σ_p totalCost(p)`.

### 3.4 Aggregate finance totals — Costs page (`renderCosts`)
```
gt = 0; gp = 0
for each paper p:
    for each costEntry e:   gt += owed; gp += paid
    if p has no costEntries: gt += parseNum(p.totalCost)
    for each apcEntry e:     gt += amount; if status==='Đã trả' gp += amount
```
Cards: **Tổng phải trả** = `gt`; **Đã thanh toán** = `gp`; **Còn nợ** = `gt−gp`; **Tỉ lệ thanh toán** = `Math.round(gp/gt*100)` % (green ≥80, else amber). (Real export: gt = 675.340.000đ, gp = 85.000.000đ, remaining 590.340.000đ, 13%.)

### 3.5 Per-author finance aggregation — `auStats(au)` (Authors page)
```
papers   = DB.papers.filter(p => p.authors.includes(au.name))         // name-substring match
pub      = papers where status==='Publication'                        // (exact 'Publication' only)
ip       = papers where sheet==='inprocess'
owed     = Σ over ALL papers of (first costEntry with author===au.name).owed   // uses .find → first match only
paid     = Σ over ALL papers of (first costEntry with author===au.name).paid
apcOwed  = Σ over papers-of-author of apcEntries where payer===au.name .amount
apcPaid  = Σ ... where payer===au.name AND status==='Đã trả'
totalOwed = owed + apcOwed ; totalPaid = paid + apcPaid ; rem = totalOwed − totalPaid
```
Reward uses a name-substring match on `p.authors` for the paper set but an exact `e.author===au.name` (and only the *first* matching cost entry per paper) for money.

### 3.6 Costs-by-author aggregation — `renderCostsByAuthor` (differs from 3.5)
Iterates **all** cost entries (not just first): builds `authorMap[e.author]` accumulating `owed`/`paid` from every reward entry, and `apcEntries` grouped by `payer`. APC entries whose `payer` matches no reward-author are collected into a **"APC / Phí không gán tác giả cụ thể"** (unassigned) bucket. Per author: `grandOwed = owed + Σapc.amount`, `grandPaid = paid + Σapc(paid if 'Đã trả')`, `rem`, `pct = round(grandPaid/grandOwed*100)`. Sorted by grand-owed descending.

### 3.7 Deadline countdown / aging (exact thresholds)
Day diff (used for conferences, special issues, dashboard upcoming):
```
diff = Math.ceil((new Date(deadline) − now) / 86400000)   // 86400000 ms = 1 day
```
Badge tiers (`dlBadge`): `diff<0` → "Hết hạn …d trước" (past); `≤7` → 🔴 urgent; `≤15` → 🟠 warn; `≤30` → green "ok"; `>30` → "Còn N ngày". **Upcoming** filters use `0 ≤ diff ≤ 60`.

**Review-too-long aging** (the only paper-aging logic in this build): for papers with `status==='Đang phản biện'`, parse `p.date` (`d/m/yyyy` → `Date`), `days = ceil((now − d)/86400000)`; if `days > 90` raise a warn notification "Phản biện lâu … Đã N ngày". The aging date field is **`p.date` (Ngày nộp / submission date)**; threshold **90 days**.

> Note on "chờ N ngày / lâu!": this exact source has no `chờ N ngày` badge or `lâu!` label on cards — the only "too-long" concept is the 90-day review notification above (`Đã ${days} ngày`). A "lâu!" badge is not present here and is likely a design-bundle addition; the faithful backend fact is: aging = days since `date` while status is `Đang phản biện`, warn at >90.

### 3.8 Dashboard / mini-stat computed fields (exact)
- `total` = papers.length; `ip` = `sheet==='inprocess'`.
- **`pub` (Đã xuất bản)** = `status==='Publication'` **exact match only** (does NOT count `Công bố`). Success rate = `round(pub/total*100)`%.
- `q1/q2/q3` = over `ap` (papers with `sheet!=='rejected'`), `rank.includes('Q1'|'Q2'|'Q3')`; `sc` = `rank.includes('Scopus')`. "Theo xếp hạng" percentages are over `(q1+q2+q3+sc)`.
- `gc` (grand cost) = `Σ totalCost(p)`.
- Journal/Conference "published" counts differ by view: journals use `status==='Publication'`; conferences use `status ∈ {Publication, Đang chờ công bố}`; Excel export uses `status ∈ {Công bố, Publication}`. (These inconsistencies are real and load-bearing to reproduce faithfully.)

### 3.9 Formatting/parse helpers (exact)
- `fmtMoney(n)` = `Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ'`; `0/NaN → '0đ'`.
- `parseNum(v)` = `parseFloat(String(v).replace(/[^0-9.]/g,'')) || 0` — strips all non-digit/non-dot; note thousand-separator dots are treated as decimal points by parseFloat but inputs are auto-formatted with dots so `parseNum("1.500.000")` = 1.5 — **however stored `owed`/`paid` are plain digit strings** (e.g. `"7500000"`) so this works. Amount inputs in the reward-category modal are auto-grouped via `fmtAmountInput` and stored as `parseInt(digits-only)`.
- `fmtDateDisplay(d)` parses an ISO date → `d/m/yyyy`.
- `rcls(rank)`: badge class by substring — Q1→bq1, Q2→bq2, Q3→bq3, Q4→bq4, Scopus→bsc, else bty.

---

## 4. CRUD & INTERACTIONS

### 4.1 Papers
- **Add** (`openAddPaper`) / **Edit** (`openEditPaper`) → 3-tab modal:
  - **Tab 1 Thông tin**: title (textarea, live duplicate check), `type` select (Tạp chí/Hội thảo, changes venue source), `status` select (grouped optgroups), venue **search + custom display name + hidden venueId**, rank typeahead (searches reward categories), `date` (date input).
  - **Tab 2 Tác giả & Chi phí**: reward-category preview (auto-synced from rank) + "🔢 Tính khen thưởng"; author picker (selected tags + search dropdown + quick badges of all authors + free-text extra author); **reward cost table** (per-author role/owed/paid/status, live role validation); **APC table** (add/remove rows, payer=selected author, amount, status); paper-level `payment` select.
  - **Tab 3 Liên kết & Ghi chú**: link, publink, localpath, note.
  - Footer: Hủy / **🔍 Kiểm tra trùng** (`checkAndShowDups`) / **💾 Lưu** (`savePaper`).
- **Save** (`savePaper`→`_savePaperCore`): requires title; runs role validation (blocks on error via alert); duplicate gate (§5/§6). New id = max+1; edit merges by id. Then `persist` + toast + close.
- **Delete** (`delPaper`): confirm → filter out → persist.
- **Detail panel** (`openDetail`): read-only slide-over with Xuất bản/Tác giả/Tài chính (reward+APC tables, totals, remaining)/Liên kết/Ghi chú; footer Sửa/Delete/Close.
- **Kanban**: columns per pipeline (KCOLS / FCOLS / Rejected). **No drag-and-drop** — cards are click-to-open-detail only. Status changes happen only via the edit modal.
- **Table view**: sortable columns (`setSort` toggles asc/desc; `sortKey` default `date` desc) — Tên/Tạp chí/Hạng/Tiến độ/Ngày nộp, plus Vai trò/Thanh toán/Chi phí (`totalCost`).

### 4.2 Journals / Conferences / Authors / Special Issues / Reward categories
All follow the same open-modal → validate name → id=max+1 (or merge on edit) → `persist` → re-render pattern:
- **Journals** `saveJournal`/`delJournal`; **Conferences** `saveConf`/`delConf` (also re-runs `checkNotifications`); **Authors** `saveAuthor`/`delAuthor`; **Special Issues** `saveSI`/`delSI` (checkNotifications); **Reward categories** `saveRC`/`delRC`/`resetToDefaultRC`.
- Required field on each: name (alert if empty).

### 4.3 Merge authors (`openMergeAuthors` → `confirmMergeAuthors`)
Pick source (deleted) + target (kept) via search. On confirm: in every paper, `p.authors = p.authors.split(source.name).join(target.name)`; every `costEntry.author===source→target`; every `apcEntry.payer===source→target`; then remove source from `authors[]`. Preview shows #papers affected. Irreversible.

### 4.4 Filtering / searching / sorting / grouping
- **Global search** (`handleSearch`): on paper pages filters by `title|journal|authors` (case-insensitive substring), with `<mark>` highlight (`hl`). Catalog pages have their own inline search boxes (journals: name/rank/country; conferences: name/fee; authors: name/org; SIs: name/journal).
- **Filter tags** (`setFilter`): paper pages support `all`, type (`Tạp chí`/`Hội thảo`), and rank (`Q1..Q4`, `Scopus`); else falls through to exact `status` match. Conferences/SIs support `upcoming` (0–60d) vs `all` (conferences default to `upcoming`). Journals support Q1–Q4/all.
- **Catalog sort** (`setCatSort` + `catalogSortKey/Dir`): locale-aware (`'vi'`) string compare; conferences special-case `deadline` as real date sort (nulls last).
- **Grouping**: journals-timeline groups by Q1/Q2/Q3/Q4-&-other; conferences/SIs timeline group into with-deadline (sorted) vs no-deadline; reward categories grouped by `group`; costs-by-author grouped per author; costs-summary status-groups by sheet.
- **Bulk ops**: none per-row; only global "nuke all", "reset dismissed", import replace/merge.
- **Inline editing**: only inside the paper modal's cost/APC tables (selects + text inputs mutate `selectedAuthors` / `apcEntries` live). No inline editing in list/table views.

---

## 5. PERSISTENCE & IO

### 5.1 localStorage keys
| key | shape |
|---|---|
| `pt_db` | full `DB` JSON (`papers/journals/conferences/authors/specialIssues/rewardCategories`) |
| `pt_notif_settings` | `{ d7,d15,d30,review,payment,toast }` booleans |
| `pt_dismissed` | JSON array of dismissed notification-id strings (loaded into a `Set`) |

On load, missing arrays are backfilled; missing `rewardCategories` seeded with defaults.

### 5.2 Export
- **JSON** (`exportData`): `{ _meta:{version:'2.0',appName,exportedAt,description}, authors, journals, conferences, specialIssues, rewardCategories, papers }` → `papertrack-data-YYYYMMDD.json`. Clears `unsaved`.
- **CSV** (`exportCSV` / `exportExcel(type)` via `downloadCSV`): per-type CSVs (papers/journals/conferences/specialissues/authors/costs), UTF-8 BOM, CRLF, quoted escaping. Column sets are enumerated in `exportExcel`.
- **Excel workbook** (`exportExcelWorkbook`, type `all`): generates a standalone multi-sheet HTML file (tabbed) openable in Excel/browser → `papertrack-export-YYYYMMDD.html`.

### 5.3 Import (`openImportModal` → `processImportFile` → `confirmImport`)
- Accepts a `.json` file (drag-drop or picker). Valid iff `data.papers` is an array.
- Preview shows counts. Two modes:
  - **merge**: append items whose `id` isn't already present, per collection (papers/journals/conferences/authors/specialIssues); reward categories replaced only if present in file.
  - **replace**: (double-confirm) wipes and installs file collections; reward categories default if absent.
- After import: `persist`, `checkNotifications`, toast, navigate to Dashboard.
- **Load sample** (`loadSampleData`): `fetch('papertrack-data.json')` (same-folder) → merge import.

### 5.4 File/link handling
- `link`/`publink`/`web`/`link(SI)` render as `target="_blank"` anchors. `localpath` is displayed as plain text only.
- Downloads use a hidden `<a id="dl-link">` + Blob URLs (revoked after click).

---

## 6. VALIDATION & EDGE CASES

- **Required fields**: paper title, journal name, conference name, author name, special-issue name, reward-category name → `alert` + abort if empty. Paper save also switches to the info tab if title missing.
- **Author-role validation** (`validateAuthorRoles`, enforced on save + live badge):
  - main present + (any first or contact) → error;
  - no main + firstCount>1 → error;
  - no main + contactCnt>1 → error;
  - mainCount>1 → error.
  Save aborts with a combined alert if any error.
- **Duplicate detection** (title similarity, §5 of the app):
  - `titleSimilarity = 0.5·jaccard(char-trigrams) + 0.3·jaccard(char-bigrams) + 0.2·jaccard(char-unigrams)`, on normalized titles (lowercased, quotes stripped, EN+VI stopwords removed).
  - `findDuplicates`: only if title length ≥15; skip candidates with sim<0.25; `sameJournal` boosts level; **high** if `sim≥0.85 || (sim≥0.7 && sameJournal)`; **medium** if `sim≥0.55 || (sim≥0.4 && sameJournal)`; else low (dropped if sim<0.35). Top 5 by sim.
  - Live inline warning appears when title length ≥20 (debounced 600 ms).
  - `savePaper` gate: when editing, if new title ≥0.85 similar to the original it saves directly; otherwise if any **high** duplicate exists it opens the blocking dup modal (must choose "⚠️ Vẫn lưu" = `forceSavePaper`); non-high dups save but flag a warning.
- **Date parsing edge cases**: paper `date` stored as `d/m/yyyy`; edit modal only back-fills the date input if it parses to 3 parts with a 4-digit year. Deadlines are ISO. Notifications parse paper `date` by splitting on `/` and require ≥3 parts.
- **Money parsing**: `parseNum` strips non-digits; stored owed/paid/amount are plain digit strings.
- **Venue free-typing**: if the user types a venue name without picking from the dropdown, `venueId` stays null and linking relies on exact name match.
- **Known latent bugs (present in source, reproduce or fix deliberately)**:
  - `closeAllRankPickers()` is **called but never defined** (in the document click handler and Escape handler) → throws `ReferenceError` on those events (rank pickers still close via other handlers).
  - Author `auStats` reward uses `.find` (first cost entry only) so a duplicate author within one paper's cost entries is under-counted; `renderCostsByAuthor` does not have this limitation.
  - `pub` inconsistency across views (`Publication` vs `Công bố` vs both) as noted in §3.8.
  - `onRewardCatChange` references `rc.hours`/`rc.coef`, which don't exist in the default categories (renders `?`).

---

## 7. FINANCE / TÀI CHÍNH VIEW LOGIC & NOTIFICATIONS

### 7.1 Costs page set membership
The Costs page operates on **`pWC`** = papers where `costEntries.length>0 || parseNum(totalCost)>0 || apcEntries.length>0`. In the real export **`pWC` = 37 papers** carry cost data (reward set 37, APC set 19; 113 papers have no cost data).

**About the "41" in TÀI CHÍNH**: no headline in the current Costs view literally computes 41 — the four cards show money totals, not a paper count. The value **41** in the export corresponds exactly to `payment==='Chưa phí'` (41 papers) — and, coincidentally, to `payment===''` (also 41). The number of papers *with cost data* is 37; papers with an outstanding balance (`totalCost−totalCostPaid>0`) is **28**. So if a redesign's "TÀI CHÍNH = 41" is a paper count, it is the **`payment==='Chưa phí'`** cohort, not the outstanding-cost cohort. Recommend confirming intent; the faithful, code-grounded finance sets are: `pWC`=37, outstanding=28, `payment='Chưa phí'`=41.

Payment enum (`payment` field) distribution and vocabulary: **`Đã trả`** (paid, 33) / **`Chưa trả`** (unpaid, 35) / **`Chưa phí`** (no fee yet, 41) / **`""`** (unset, 41). This is a card-level summary label, independent of the detailed cost/APC math.

### 7.2 Costs views
- **bypaper** (`renderCostsByPaper`): two tables — 🏆 Khen thưởng (rowspan per paper, per-author owed/paid/remaining/status) and 📄 APC (payer/amount/status).
- **byauthor** (`renderCostsByAuthor`): per-author cards (reward rows + APC rows + progress %), plus an unassigned-APC bucket. See §3.6.
- **summary** (`renderCostsSummary`): top-15 per-paper cost bars (owed vs paid overlay), cost-by-sheet-status bars, and a per-paper table with payment-progress bars (`pct = round(paid/totalCost*100)`; paid here = reward paid only).

### 7.3 Notifications engine (`checkNotifications(isStartup)`)
Runs on boot and hourly. Builds `notifications[]`; respects per-type toggles and the `dismissedNotifs` set (keyed ids). Never notifies for past deadlines.
- **Conference deadlines** (key `cf_dl_{id}`): `0<diff≤7` → urgent (if `d7`); `≤15` → warn (if `d15`); `≤30` → info (if `d30`).
- **Special-issue deadlines** (key `si_dl_{id}`): same tiers.
- **Review-too-long** (key `review_long_{paperId}`, if `review`): `status==='Đang phản biện'` and `days-since-date > 90` → warn.
- **Unpaid reward costs** (key `pay_{paperId}_{author}`, if `payment`): for each costEntry with `owed>0 && paid<owed` → info "Nợ {author}: {owed−paid}". (APC unpaid is NOT surfaced as a notification.)
- Badge = `notifications.length` (`9+` cap). **Startup toasts**: if `toast` enabled, up to 3 `urgent` notifications shown as staggered toasts (delay `i*800+500 ms`).
- **Settings** (`ns-7/15/30/review/payment/toast` → `{d7,d15,d30,review,payment,toast}`), persisted to `pt_notif_settings`. Dismiss single (`dismissNotif`), clear all (`clearAllNotifs`), reset dismissed (`clearDismissed`).

---

## 8. Reference: reusable helpers (for rebuild parity)
`persist`, `markUnsaved`, `setDataStatus`; `nav`, `getFiltered`, `filterBar`, `setFilter`, `setSort`, `sorted`, `hl`, `rcls`, `fmtMoney`, `parseNum`, `fmtDateDisplay`; `totalApc`, `totalApcPaid`, `totalCost`, `totalCostPaid`; `titleSimilarity`, `findDuplicates`, `_normalizeTitle`, `_ngrams`, `_jaccard`, `_sharedKeywords`; `calcRewardsFromCategory`, `validateAuthorRoles`; `checkNotifications`, `showToast`.

Key module dividers in source: DATA STORE (~1005), NOTIFICATIONS (~1100), IMPORT/EXPORT (~1293), NAVIGATION (~1409), renders (Dashboard 1732, Journals 1824, Conferences 1965, Authors 2133, Costs 2338, Excel 2639, Notifications page 2794, rank search 2882, Special Issues 3181), PAPER CARD 3433, DETAIL PANEL 3453, PAPER MODAL 3521, REWARD CATEGORIES 3717, MERGE AUTHORS 3934, DUP DETECTION 4127, journal/conf/author CRUD 4346, HELPERS 4411.

Files referenced (absolute):
- App source: `/Users/quocs/Downloads/papertrack.html`
- Real data export (source of truth for counts/shapes): `/Users/quocs/Downloads/papertrack-data-20260525.json`