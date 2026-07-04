I have now read the entire prototype (all 2189 lines of `PaperTrack.dc.html`), the full `renderVals()` business logic, the reward-category and sample data in `papertrack-data.js`, and cross-referenced all five screenshots. Below is the complete implementation spec.

---

# PaperTrack — Pixel-Perfect Implementation Spec

**Source of truth:** `/…/papertrack-redesign/project/PaperTrack.dc.html` (2189 lines) + `papertrack-data.js` (`DEFAULT_DB`, v3).
**App concept:** A Vietnamese scientific-publication ledger for a university IT faculty (IUH · CNTT), styled as a hand-kept archival accounting book ("sổ") — paper grain, coffee-ring vignettes, wax stamps, washi-taped sticky notes, tally marks, ink-bleed and rubber-stamp motion. All state is client-side (`localStorage` key `papertrack2.db`, version `v:3`; notification prefs in `papertrack2.ns`). Data auto-persists after every mutation.

> Screenshot note: screenshots `SCR-nkiv`/`SCR-nbsc` and the right-side masthead caption "sổ ghi bằng tay, lưu bằng máy" come from an earlier variant that rendered a separate `MỤC ›` sub-nav row. **The shipping code (this file) has no such caption and no `MỤC ›` prefix** — the active top-tab instead *expands inline* to reveal its sub-items. Build from the code; the sub-item labels/counts are identical either way.

---

## 1. DESIGN TOKENS

### 1.1 Color palette (every hex + role)

**Paper / surface neutrals (warm cream stack, lightest→darkest):**
| Hex | Role |
|---|---|
| `#EDE8DA` | `body` base fill (behind the app frame) |
| `#F5F1E6` | Primary page paper; active nav-tab fill; light text on dark chips; seam highlight under active tab |
| `#F6F0DF` | Detail drawer (`aside`) background |
| `#FBF7EC` | Overview sticky note; paper-modal paper base |
| `#FDFAF0` | Kanban card; cost/settlement receipt slips; urgent notification card |
| `#F1EBDA` | Rank badge fill; author avatar backing; local-path box fill |
| `#EAE3D0` | Reward-abbr chip fill; **selected** type-toggle fill |
| `#EAE0C6` | Drawer header strip fill |
| `#E9E0C9` | **Inactive** nav-tab fill |
| `#F0E9D6` | Inactive nav-tab hover fill |

**Ink / text:**
| Hex | Role |
|---|---|
| `#221D14` | Primary ink — body text, dark buttons, 2px/1.5px rules, tally sticks |
| `#3A3226` | Signature ink (Dancing Script author names) |
| `#4A3E2A` | Sticky-note handwriting |
| `#6E6142` | Rank-badge text |
| `#77705F` | Secondary text — subtitles, mono section labels, dates |
| `#8A8377` | Tertiary/inactive text |
| `#B0A890` | Faint text — placeholders (italic), row `№`, dim counts, empty states |

**Hairlines / borders:**
| Hex | Role |
|---|---|
| `#D8D0BC` | Stat-cell underline, card border, section rules |
| `#DDD6C6` | Table row dividers; dotted leader lines |
| `#E5DFCE` | Lighter dividers; tab right-border; notif section rules |
| `#D3CBB6` | Ruled-paper line in the title `<textarea>` (31px pitch) |
| `#A99F87` | Dotted underline for signatures & text inputs |
| `#C9C2B2` | Disabled/light border; scrollbar thumb; neutral pill border |
| `#C9BFA4` | Rank-badge border; avatar frame; dashed local-path border |

**Brand accent — red (`#A3382B`) is the single dominant accent.** Used for: logo `❧`, active-tab top mark, all Dancing-Script annotations, the hard offset button shadow, urgent countdowns, "kỷ lục!" ring, wax stamp, `Đánh giá lại`/`Từ chối` status, "cần thu" amounts, section-numeral pipe rule. Selection highlight is `rgba(163,56,43,.18)`; hover row wash is `rgba(163,56,43,.05)`; ghost-rule overlays use `rgba(163,56,43,.26)`.

**Status / pipeline colors — `_SC()` map (verbatim):**
| Status (VN) | Hex | Hue |
|---|---|---|
| `Nộp bài` | `#2B5C9E` | blue |
| `Đang phản biện` | `#5C4EA8` | violet |
| `Chỉnh sửa` | `#B4691E` | amber |
| `Đánh giá lại` | `#A3382B` | red |
| `Chấp nhận` | `#5A6E3A` | olive |
| `Chờ công bố` | `#77705F` | grey |
| `Công bố` | `#3E6E45` | green |
| `Xét khen thưởng` | `#8A6D1F` | gold |
| `Từ chối` | `#A3382B` | red |
| *(fallback)* | `#77705F` | grey |

**Semantic finance colors:** collect/owe-to-fund = `#A3382B`; pay-out = `#5A6E3A`; settled/neutral = `#8A8377`; positive net/published = `#3E6E45`; "waiting reward"/gold = `#8A6D1F`. Link blue (submission URL, DOI) = `#2B5C9E`; publication link green = `#3E6E45`. Delta-up green `#3E6E45`, delta-down red `#A3382B`.

**Decorative:** washi tape = `repeating-linear-gradient(45deg, rgba(201,179,106,.45) 0 6px, rgba(201,179,106,.3) 6px 12px)`; pushpin = `radial-gradient(circle at 35% 30%, #C9584A, #7E241A)`; dashed timeline spine = `repeating-linear-gradient(180deg,#A3382B 0 7px,transparent 7px 12px)` at `opacity:.55`; stage bar accent for "Chấp nhận" = `#8A7A4A`; watermark section numerals = `rgba(34,29,20,.07)`.

### 1.2 Type scale

Loaded from Google Fonts: **Spectral** (400/500/600 + italics), **Instrument Serif** (roman+italic), **IBM Plex Mono** (400/500/600), **Dancing Script** (400–700).

- **Spectral (serif)** — body default (`font-size:15px; line-height:1.5`). Paper/journal/author titles (15–16px, weight 500; drawer title 21px/600). Italic Spectral = every subtitle/caption/venue line and input placeholders.
- **Instrument Serif** — display numerals & wordmark. Wordmark 32px/400 (`letter-spacing:.2px`). Hero total **148px**/400, `line-height:.85`, `letter-spacing:-3px`, `font-variant-numeric:tabular-nums`. Stat-cell numbers 46px. Stage counts 38px. Status-filter counts 21px (Spectral 500, not Instrument). Watermark section numerals (I/II/III/IV/№/T/H/S/A/₫/K/!/D) 92px italic. Modal `№` 29px italic.
- **IBM Plex Mono** — all uppercase micro-labels, badges, dates, amounts, buttons. Sizes seen: 8px→13px. Nav tab label 10.5px/`letter-spacing:1.5px`; section eyebrow 10.5px/`1.8px`; stat eyebrow 9.5–10px/`1.6–1.8px`; rank badge 9.5px; status stamp 8.5px/`.8px`.
- **Dancing Script (cursive, weight 600)** — every "handwritten" element: red margin annotations ("kỷ lục!", "chờ N ng — lâu!", "gấp!", "nhắc nhóm!", ROI note, delta note), author signatures (`#3A3226`, 19–20.5px), sticky-note text (`#4A3E2A`, 18.5–19px), settlement author names, reward hint in the form, "mở sổ thu chi ↗" links.

**Rotations** (hand-placed feel), applied liberally: rank badge `rotate(-1.2deg)`; status stamps alternate `1deg`/`-1.4deg` by row parity; "kỷ lục!" `-5deg`; sticky note `1.4deg`; annotations `-1.5deg…-5deg`; toast `-.5deg`; drawer receipt `.6deg`; countdown circles use `rots = ['-5deg','3deg','-2deg','4deg','-3deg','2deg','-4deg']` indexed by position.

### 1.3 Spacing / borders / shadows / textures

- **Page rhythm:** header `padding:20px 48px 0`; main `padding:28px 48px 0`; page bottom padding `70px`. Masthead rule = **double rule**: `border-top:2px solid #221D14` then `margin-top:3px` + `border-top:1px solid #221D14` (this 2px+1px "letterpress" double rule repeats atop every modal). Screen section headers use a `1.5px solid #221D14` underline drawn via `ptDraw`.
- **Section grids:** dashboard top row `grid-template-columns:minmax(200px,260px) minmax(355px,1fr) minmax(165px,215px); gap:28px`. Lower dashboard `1.55fr 1fr; gap:52px`. Stat-cell grid `repeat(auto-fit,minmax(163px,1fr)); column-gap:24px; row-gap:20px`.
- **Hard offset red button shadow (signature element):** dark button `background:#221D14; color:#F5F1E6; box-shadow:3px 3px 0 rgba(163,56,43,.85)`; on hover `transform:translate(-2px,-2px); box-shadow:5px 5px 0 rgba(163,56,43,.85)`; `transition:all .18s`. Toast reuses `4px 4px 0 rgba(163,56,43,.5)`; urgent card `3px 3px 0 rgba(163,56,43,.22)` → hover `5px 5px 0 rgba(163,56,43,.35)`; settlement chip `2px 2px 0 rgba(34,29,20,.07)` → hover `3px 3px 0 rgba(163,56,43,.4)`.
- **Soft shadows:** kanban card `0 1px 3px rgba(34,29,20,.07)` → hover `0 6px 16px rgba(34,29,20,.13)`; sticky note `0 3px 12px rgba(34,29,20,.14)`; drawer `-12px 0 40px rgba(34,29,20,.22)`; modal `0 24px 70px rgba(34,29,20,.4)`.
- **Rubber-stamp border radius:** status stamps use lopsided `border-radius:3px/7px` (or `4px/8px`, `4px/9px`, `6px/14px` at larger sizes) + `mix-blend-mode:multiply` + slight rotation to read as ink pressed on paper.
- **Page background texture** (on the app root div):
  `radial-gradient(ellipse at 18% -5%, rgba(255,253,246,.85), transparent 55%)` (top-left glow) + `radial-gradient(ellipse at 90% 110%, rgba(214,201,172,.35), transparent 50%)` (bottom-right coffee vignette) + `repeating-linear-gradient(0deg, rgba(28,25,19,.016) 0 1px, transparent 1px 3px)` + `repeating-linear-gradient(90deg, rgba(28,25,19,.012) 0 1px, transparent 1px 4px)` (fine paper grain) over `#F5F1E6`. Modals repeat a lighter version over `#FBF7EC`.
- **Ledger "margin rule"** (red vertical line ~44px in): rows sit on `background:linear-gradient(90deg, transparent 44px, rgba(163,56,43,.26) 44px, rgba(163,56,43,.26) 45.5px, transparent 45.5px)`.
- **Crop-mark / cut affordances:** receipt headers show `✂ ─ ─ ─ ─` in mono; slip dividers use `1px dashed #C9C2B2`; hatch fillers use `repeating-linear-gradient(-45deg, transparent 0 6px, rgba(34,29,20,.045) 6px 7px)`.
- Scrollbars: `6px`, thumb `#C9C2B2` radius 3px; nav scrollbar hidden.

---

## 2. ANIMATIONS & MICRO-INTERACTIONS (reproduce exactly)

### 2.1 `@keyframes` (verbatim frames)
```
ptUp     from{opacity:0;transform:translateY(14px)}                        to{opacity:1;transform:translateY(0)}
ptInk    from{opacity:0;filter:blur(5px);transform:translateY(8px)}        to{opacity:1;filter:blur(0);transform:translateY(0)}
ptDraw   from{transform:scaleX(0)}                                          to{transform:scaleX(1)}
ptFade   from{opacity:0}                                                    to{opacity:1}
ptStamp  0%{opacity:0;transform:rotate(-26deg) scale(1.85)}
         55%{opacity:.92;transform:rotate(-11deg) scale(.94)}
         75%{transform:rotate(-13deg) scale(1.04)}
         100%{opacity:.88;transform:rotate(-12deg) scale(1)}
ptPanel  from{opacity:0;transform:translateX(26px)}                         to{opacity:1;transform:translateX(0)}
ptPage   from{opacity:0;transform:translateY(10px)}                         to{opacity:1;transform:translateY(0)}
ptTabIn  from{opacity:0;transform:translateY(6px)}                          to{opacity:1;transform:translateY(0)}   (defined, unused)
ptChildIn from{opacity:0;transform:translateX(-7px)}                        to{opacity:1;transform:translateX(0)}   (defined, unused)
```
Standard easing throughout: `cubic-bezier(.2,.7,.2,1)`.

### 2.2 Where each is applied
- **`ptInk`** (ink-bleed, blur→sharp) — hero total block (`1s .1s`); catalog-drawer title (`.6s .1s`).
- **`ptUp`** — every stat cell (staggered `.6s` at delays `.2s .28s .36s .44s .52s .6s`); stage columns (`.5s`, delay `0.4+i·0.08`); settlement summary tiles (`.08/.16/.24s`); drawer content sections (`.5s` at `.18/.24/.3/.38/.46/.52/.58/.64s`); modal card entrance (`.35s`); toast.
- **`ptDraw`** (`scaleX(0)→1`, `transform-origin:left`) — every 1.5px section underline (delays `.3–.6s`) and every stage/tally progress bar. The active-tab red top mark also scales X via `transform:scaleX(nt.markScale)` with `transition:transform .45s … .1s`.
- **`ptFade`** — sparkline block, ledger row containers, "kỷ lục!" ring (`.5s 1.3s`) + label (`.5s 1.5s`), sticky note (`.6s 1.1s`), deadline/tally lists, settlement slips (`.45s` at `0.08+i·0.05`), urgent cards, notification rows, modal/drawer overlays (`.25s`), catalog photo.
- **`ptStamp`** (over-rotate + overshoot scale, lands ~`-12deg`, `opacity:.88`, `mix-blend-mode:multiply`) — the **ĐÃ KIỂM KÊ wax seal** (`.7s .8s`); ledger/drawer/modal status stamps; settlement "Tất toán"/"Chờ thưởng" stamps (staggered `stampDelay = 0.4+i·0.05s`); notifications "Không có việc gấp ✓" seal; countdown circle in catalog drawer; the live preview stamp in the paper modal.
- **`ptPanel`** — detail drawer & catalog drawer slide-in from right (`.35s`).
- **`ptPage`** — each papers/catalog/finance/notif/data screen mounts with this (`.45s`); keyed on `pageKey`.
- **Hover/active/focus states:** nav tab inactive lifts `translateY(-2px)` + bg→`#F0E9D6`; dark buttons do the `translate(-2px,-2px)` + grown red shadow; table/card rows wash `rgba(163,56,43,.05)` and ledger rows also `translateX(4px)`; kanban cards `translateY(-2px)` + deeper shadow + border→`#B8AE95`; inputs focus `border-color:#A3382B`; the `↦` advance arrow sits at `opacity:.25/.3` and animates to `opacity:1; translateX(2px)` on hover; drawer route dates are `opacity:0` and reveal on row hover via `[data-rt-row]:hover [data-rt-date]{opacity:1}`; `✕` close buttons color→`#A3382B`.
- **Motion kill-switch / capture fallback:** `componentDidMount` detects frozen-timeline capture environments and, if animations aren't progressing, injects `*{animation-duration:0s!important;animation-delay:0s!important}`. Prop `motion:false` (default true) also kills all motion. Props `showNote` (default true) toggles the sticky note; `defaultView` (`ledger`|`kanban`, default **kanban**) sets the papers view; `avatarStyle` enum (`notionists`/`croodles`/`open-peeps`/`adventurer`/`none`, default `notionists`) selects the DiceBear avatar set.

---

## 3. GLOBAL CHROME

### 3.1 Masthead (`padding:20px 48px 0`)
Flex row, `align-items:center; gap:16px`:
1. **Logo lockup** (`gap:9px`): `❧` in `#A3382B` 22px + wordmark **"PaperTrack"** (Instrument Serif 32px).
2. **Subtitle** (italic 13px `#77705F`, nowrap): `sổ theo dõi công bố khoa học — khoa Công nghệ thông tin`.
3. **Date** (`margin-left:auto`, italic 13px `#77705F`): `{{todayLong}}` = VN long date, first letter capitalized, e.g. `Thứ Sáu, 3 tháng 7, 2026`.
4. **Primary button** `+ Thêm bài báo` — dark button with hard red shadow (see token §1.3); mono 10.5px, `letter-spacing:1px`, uppercase, `padding:9px 16px`. `onClick=openAdd`.

Then the **double rule** (2px + 1px `#221D14`).

### 3.2 Primary nav (`nav[aria-label="Điều hướng"]`, horizontally scrollable, scrollbar hidden)
A file-folder tab strip: a `1.5px #221D14` baseline runs full width; tabs sit `align-items:flex-end`, `border-radius:5px 5px 0 0`, `border-bottom:none`, `height:39px`. Six groups (`navTabs`), each: mono label 10.5px `letter-spacing:1.5px` uppercase + red badge count.

| Tab label | Count badge source | Landing page |
|---|---|---|
| `Tổng quan` | — | `dashboard` |
| `Sổ bài báo` | `inproc.length` (e.g. **· 34**) | `inprocess` |
| `Danh mục` | — | `journals` |
| `Tài chính` | `setPendingCount` = collect+pay counts (e.g. **· 41**) | `settle` |
| `Thông báo` | `notifCount` = urgent count (e.g. **· 1**) | `notifications` |
| `Dữ liệu` | — | `data` |

**Active-tab treatment:** `z-index:2`, fill `#F5F1E6`, border `1.5px solid #221D14`, `padding:0 16px`, subtle `box-shadow:0 -2px 5px rgba(34,29,20,.06)`, a `#F5F1E6` "seam" strip covering the baseline (`seamOp:1`), and a red top mark `#A3382B` (2.5px, `border-radius:2px`, inset 14px) that scales in (`markScale:1`, `transition .45s …`). **Inactive:** fill `#E9E0C9`, border `1.5px solid #A79D85`, `padding:0 12px`, no mark, hover lifts `-2px` and fill→`#F0E9D6`, label color `#77705F`→`#221D14`.

**Sub-items (children) expand inline inside the active tab** — an `overflow:hidden` flex container animating `max-width` from `0px`→`Math.round(estW)px` and `opacity` 0→1 (`transition:max-width .45s …, opacity .3s .08s`), preceded by a `1px×15px #C9C2B2` divider. Each child is an italic Spectral 14px button (active child weight 600, `#221D14`, `border-bottom:1.5px solid #A3382B`; inactive weight 400, `#8A8377`, transparent bar) with a mono red count suffix. `estW = kids.reduce((t,k)=> t + (k.label.length + k.countText.length)*7.4 + 13, 40) * 1.25`.

**Sub-item sets:**
- **Sổ bài báo:** `Đang xử lý · {inproc}` (→`inprocess`), `Hoàn thành · {finished}` (→`finished`), `Từ chối · {rejected}` (→`rejected`), `Tất cả hồ sơ · {all}` (→`all`).  Sample counts: 34 / 107 / 9 / 150.
- **Danh mục:** `Tạp chí · {n}`, `Hội thảo · {n}`, `Special Issue · {n}`, `Tác giả · {n}`.
- **Tài chính:** `Thu chi nội bộ · {setPendingCount|—}`, `Sổ chi phí`, `Khen thưởng`.

Switching tabs via `nav(key)` resets `q, pfilter, qfilter` and all pager pages, and clears selection.

### 3.3 Loading / ready gates
While `db==null`: `Đang mở sổ…` (italic, centered, `padding:120px 48px`). Otherwise `<main>` renders the active screen.

### 3.4 Search box (per-screen, right-aligned in the screen header)
Transparent input, `border-bottom:1px solid #C9C2B2`, italic Spectral 14px, focus border→`#A3382B`. Papers: placeholder `Tìm tên bài, tạp chí, tác giả…` (width 230px). Journals: `Tìm tạp chí…` (width 200px). Bound to `q`/`setQ`, resets `ppage`/`jpage` to 0.

---

## 4. SCREENS

Every screen header is a flex baseline row: a giant `rgba(34,29,20,.07)` Instrument-Serif-italic 92px **watermark letter** absolutely positioned `left≈-10px; top:-38px`, then a mono uppercase eyebrow, an italic grey count caption, optional right-aligned controls, then a `1.5px #221D14` `ptDraw` underline.

### 4.1 Overview / TỔNG QUAN (`data-screen-label="Tổng quan"`)

**Top grid (3 cols):**

**Left — Hero + sparkline.** Eyebrow `Tổng bài báo`; hero number `{{total}}` (148px). Sub: `{journalCount} tạp chí · {confCount} hội thảo · {rejectedCount} từ chối` (last clause red). Whole block links to `all`; hover→`#A3382B`.
Below: **12-month submission sparkline** — eyebrow `NHỊP NỘP BÀI · 12 THÁNG` + red Dancing-Script peak note `{{sparkPeakNote}}` (`đỉnh T{m}: {n} bài`). 12 bars (`height:52px`, `border-bottom:1.5px #221D14`, `gap:4px`); each bar `height=b.h`, current month (`i==11`) `#A3382B` else `#221D14`, empty months `opacity:.15`, filled `.72`/current `.95`; `title` tooltip `Tháng {m}/{yyyy}: {n} bài`. Footer: `{{sparkStart}}` (`T{m}/{yy}`) · `{{sparkTotal}} bài đã nộp` · `{{sparkEnd}}`.

**Center — six stat cells** (`ptUp` stagger, each `border-bottom:1px #D8D0BC`, clickable, hover text+border→`#A3382B`):
1. `Đã công bố` → **68**, italic `{{pubPct}}% tỷ lệ thành công` → goFinished.
2. `Hạng Q1/Q2` → **{{q12}}** (e.g. 29) wrapped in the hand-drawn **red wobble ring** (`border:2.5px solid rgba(163,56,43,.75); border-radius:48% 52% 46% 54%/55% 46% 54% 45%; rotate(-4deg)`, `ptFade .5s 1.3s`) + Dancing-Script **`kỷ lục!`** (`-5deg`, `ptFade .5s 1.5s`); sub `{{q1}} bài Q1 · {{q2}} bài Q2` → goAllPapers.
3. `{{yearNowLabel}}` (`Nộp năm {year}`) → `{{yearNowCount}}` + delta note `{{yearDeltaNote}}` (`↑ +N bài!`/`↓ −N bài!`, color green/red); sub `{{yearPrevSub}}` (`năm {y-1}: {n} bài`) → goAllPapers.
4. `Khen thưởng dự kiến` → `{{rewardV}}` + italic 20px unit `{{rewardU}}` + Dancing-Script `{{roiNote}}` (`≈ N× chi phí!` when ROI≥2); sub `theo Quy chế 2026` → goRewards.
5. `Chi phí đã chi` → `{{spentV}} {{spentU}}`; sub `APC · hội nghị · hiệu đính` → goCosts.
6. `Phí chờ thanh toán` → `{{unpaidV}} {{unpaidU}}` + `{{unpaidMark}}` (`nhắc nhóm!` or `✓ sạch sổ`); sub `{{unpaidSub}}` (`{n} khoản đang chờ xử lý` / `không có khoản nào chờ`) → goCosts.

**Right — wax seal + sticky note.**
- **ĐÃ KIỂM KÊ seal:** 126px circle, `border:2.5px solid #A3382B`, `mix-blend-mode:multiply`, `ptStamp .7s .8s`; inner 106px dashed ring holds `IUH · CNTT` / `ĐÃ KIỂM KÊ` (with top+bottom rules) / `{{todayDots}}` (`DD.MM.YYYY`).
- **Taped sticky note** (only if `showNote`): `#FBF7EC`, `rotate(1.4deg)`, `box-shadow:0 3px 12px …`, a washi-tape strip at top-center; text (Dancing Script 19px `#4A3E2A`): `Nhắc nhóm nộp RIVF trước 10/07 — cần bản final PDF + phản hồi reviewer 2!` (`trước 10/07` underlined) and sign-off `— M.Anh ↘` (red, right).

**Lower grid (`1.55fr 1fr`, gap 52px):**
- **I. Tiến trình xử lý** — right caption `{{inprocCount}} bài trong quy trình`. Five stage columns (`grid repeat(5,1fr)`): Instrument-Serif 38px count, mono label, and a 3px `ptDraw` bar `width = max(count/maxStage*100, 8)%`. Stages & bar colors: `Nộp bài`(#221D14), `Phản biện`(#221D14), `Chỉnh sửa`(#A3382B), `Đánh giá lại`(#A3382B), `Chấp nhận`(#8A7A4A). *(Screenshot: 15 / 7 / 2 / 3 / 7.)*
- **II. Sổ theo dõi — đang xử lý** — right link `Xem tất cả {{inprocCount}} bài →` (→inprocess). Ledger of first 5 in-process papers on the red margin rule; grid `32px 1fr 140px 74px 96px`: `№`, title + italic venue (+ red `✎` if note), a rotated status stamp, rank chip, right date. Rows link to the paper (`openP`), hover wash + `translateX(4px)`.
- **III. Hạn nộp sắp tới** — right link `Xem hội thảo →` (→conferences). Dashed vertical spine; up to 4 upcoming deadlines: a 56px countdown circle (`{days}` + `NGÀY`) whose fill/border/fg switch to red when `days≤15` (urgent) or amber-on-cream when `≤30` (warn), rotated per `rots`; name + red Dancing-Script `gấp!` if urgent; sub `{sub} · hạn {date}`.
- **IV. Kiểm đếm theo hạng** — right caption `1 vạch = 1 bài`. Tally rows for `WoS-Q1`, `WoS-Q2`, `Scopus`, `Khác`: label + groups of 4 vertical `2.5px×17px #221D14` sticks with a red diagonal `rotate(-22deg)` strike over each *complete* group of five, + right count.

**Footer:** centered `❦` + mono `CẬP NHẬT {{todayDots}} — {{total}} HỒ SƠ — IN TẠI XƯỞNG PAPERTRACK`.

### 4.2 Sổ bài báo / papers (`inprocess|finished|rejected|all`)

Header watermark `№`; eyebrow `{{papersHeading}}` (map: `Sổ theo dõi — đang xử lý` / `— hoàn thành` / `— từ chối` / `— tất cả hồ sơ`); caption `{{papersCount}} hồ sơ`; search box; then (when `canKanban`, i.e. page≠`all`) a view toggle: `SỔ CÁI` (ledger) / `PHIẾU` (kanban), active gets `#221D14` + `border-bottom:2px #A3382B`.

**Status-filter strip** — a bordered row of buttons: `Tất cả` + each status valid for the sheet (`inprocess`→ first 5 pipeline; `finished`→ `PIPE.slice(4)`; `rejected`→`Từ chối`; `all`→ all 9). Each: big Spectral 21px count wrapped in a wobble ring when selected (`rgba(163,56,43,.75)`), mono uppercase label; zero-count non-`all` filters dim to `opacity:.45`; trailing hatch filler. *(all-view strip, per screenshot: 150 · 15 · 7 · 2 · 3 · 7 · 39 · 65 · 3 · 9, last = active red.)*

**Ledger view** (`viewLedger`): header row grid `32px 1fr 136px 64px 140px 88px` — `№`, sortable `Bài báo — tạp chí / hội thảo{{mTitle}}`, `Tác giả`, sortable `Hạng{{mRank}}`, sortable `Tiến độ{{mStatus}}`, sortable `Ngày nộp{{mDate}}` (sort marker ` ↓`/` ↑`). Rows on the red margin rule:
- `№` (mono, `#B0A890`); title 15.5px/500 + italic venue + red `✎ ghi chú` if note;
- `authorsShort` (initials, italic);
- rank chip (`F1EBDA`/`C9BFA4`, `rotate(-1.2deg)`);
- **progress cluster:** rotated status stamp + hover `↦` advance arrow (title `Chuyển sang {nextSt}`) + a row of 8 progress dots (filled up to current status in `SC[status]`, else `#DDD6C6`);
- date + Dancing-Script **age line** `{{ageF}}` (see §6) colored `#A3382B` when stale else `#B0A890`.
Pager (`_pager`, 12/page, noun `hồ sơ`) below; empty state: `Không có hồ sơ nào khớp.` + inline `Thêm bài báo mới` link.

**Kanban view** (`viewKanban`): columns = `PIPE.slice(0,5)` (or `slice(4)` finished / `['Từ chối']`), grid `repeat(kColCount, minmax(185px,1fr)); gap:20px`, horizontally scrollable. Column header: mono label in `SC[status]` + grey `· {count}`, a 1.5px solid + 1px `.4` opacity colored double underline. **Card anatomy** (`#FDFAF0`, left 3px colored spine `opacity:.7`): top row `№ {no}` + red `✎` note mark + right-aligned Dancing-Script age (`{{ageF}}`, `rotate(-1.5deg)`); title 13.5px/500; italic venue; a dashed-top footer with rank chip + date + hover `↦` advance. Empty column → dashed box `— trống —`.

### 4.3 DANH MỤC — four sub-screens

**Tạp chí (journals)** — watermark `T`, eyebrow `Danh mục tạp chí`, caption `{{journalsCount}} tạp chí`, search `Tìm tạp chí…`, ghost button `+ Thêm tạp chí`. Q-filter row: `Tất cả / Q1 / Q2 / Q3 / Q4` (mono, active red underline). Table grid `32px 1fr 100px 64px 56px 100px 72px`, headers `№ / Tạp chí — nhà xuất bản / ISSN / Hạng / IF(right) / Quốc gia / Đã gửi(right)`. Rows on red margin rule: name(500) + italic ` — {publisher}`, mono issn, rank chip, impact (comma-decimal), italic country, used-count (`papers where venue==name`). Pager 12/page noun `tạp chí`. Publisher falls back to the web host; issn falls back to `fee`.

**Hội thảo (conferences)** — watermark `H`, eyebrow `Lịch hội thảo`, caption `{{confsCount}} hội thảo · sắp theo hạn nộp`, button `+ Thêm hội thảo`. Dashed timeline spine, rows sorted by deadline (past pushed to bottom, `opacity:.55`). Each: 60px countdown circle (`{big}`=`✓` if past else days; `{small}`=`ĐÃ QUA`/`NGÀY`; urgent/warn coloring as §1.1), name(500), italic sub `{location} · {rank} · diễn ra {confdate}`, right block: `HẠN {date}` (mono, red if urgent), fee `phí {money|feeText}`, and Dancing-Script `{n} bài đã gửi ↗` when linked papers exist.

**Special Issue (specialissues)** — watermark `S`, eyebrow `Special Issue / Chương sách`, caption `{{sisCount}} lời mời đang mở`, button `+ Thêm mục`. Same timeline pattern; each row circle shows days + `NGÀY`, name + a mono type pill `{type}`, italic `{journal} · {rank}`, right `HẠN {date}`. (`DEFAULT_DB.specialIssues` ships empty.)

**Tác giả (authors)** — watermark `A`, eyebrow `Danh bạ tác giả`, caption `{{authorsCount}} tác giả · 1 vạch = 1 bài`, button `+ Thêm tác giả`. Grid `32px 1.3fr 1fr 80px 170px`, headers `№ / Tác giả — đơn vị / Kiểm đếm bài / Q1/Q2 / Khen thưởng ước tính(right)`. Rows: `№`; optional 38px DiceBear avatar (rotated `±2deg`, `filter:saturate(.75) sepia(.12)`, `1px #C9BFA4` frame, `1px 1px 0` shadow) + name(`{title} {name}`) + italic `{unit} · {email}`; tally sticks (15px tall) + count of non-rejected papers; Q1/Q2 count; estimated reward (mono).

### 4.4 TÀI CHÍNH — three sub-screens

**Thu chi nội bộ / settle (`isSettle`, `max-width:1000px`)** — watermark `₫`, eyebrow `Sổ thu chi nội bộ`, caption `quỹ công bố — chủ trì ứng chi phí & nhận thưởng, phần ròng chia đều theo tác giả`.
Three summary tiles (`ptUp`): `Cần thu về quỹ` `{{setCollectF}}` (`#A3382B`) `{{setCollectN}} khoản chưa thu`; `Cần chi trả` `{{setPayF}}` (`#5A6E3A`) `{{setPayN}} khoản chưa trả`; `Đã tất toán` `{{setDoneF}}` `{{setDoneN}} khoản đã ghi sổ`.
`Đối chiếu theo tác giả` — wrapping author chips (rotated, hard shadow): avatar + Dancing-Script name + mono status line `{{sa.text}}` (`cần thu …`/`cần trả …`/`✓ tất toán`) color-coded; click opens the author drawer.
**Settlement slips** (`setSlips`, paged 6/slip via `sPager`): `#FDFAF0` card, slight rotate, dimmed to `.68` when settled. Header: `Phiếu quyết toán — hồ sơ №{{no}}`, optional stamp (`Tất toán` green / `Chờ thưởng` gold, `ptStamp`), title, italic `{venue} · {n} tác giả`, right status stamp. Body grid `300px 1fr`: **left** ledger — `Thưởng` / `Chi phí quỹ đã ứng` / double-rule `Ròng` / italic `mỗi phần` with dotted leaders and computed values; optional reward toggle button `☐ Thưởng đã về quỹ?` ↔ `✓ Thưởng đã về quỹ`. **Right** per-author rows: Dancing-Script name, dotted leader, `{{amtText}}` (`thu/còn thu …`, `trả/còn trả …`, `✓ đã thu/đã trả … · date`, or `chờ thưởng về`), a primary action button (`✓ ghi đã thu` / `✓ ghi đã trả` / `hủy`) and a `½ một phần` partial button (via `prompt`). Pager, empty state `Chưa có khoản thu chi nào — thêm chi phí vào hồ sơ, hoặc chờ bài có từ 2 tác giả đạt mức thưởng.`, and the italic **convention footnote**: `Quy ước: quỹ (do chủ trì giữ) ứng toàn bộ chi phí và nhận tiền thưởng của trường; phần ròng = thưởng thực nhận − chi phí, chia đều theo số tác giả. Ròng âm → thu từ mỗi tác giả; ròng dương → chi trả cho mỗi tác giả. Khi tiền thưởng về quỹ, số còn thu / còn trả tự cập nhật lại.`

**Sổ chi phí / costs (`isCosts`)** — watermark `₫`, eyebrow `Sổ chi phí`, caption `{{costsCount}} hồ sơ có chi phí — tổng {{grandTotalF}}`. Grid `32px 1fr 130px 130px 130px 150px`, headers `№ / Bài báo / APC(r) / Hội nghị(r) / Hiệu đính / khác(r) / Tổng(r)`; only papers with total>0; `—` for zero cells; pager 12/page noun `khoản chi`; bottom **`Tổng cộng`** row on a `2px #221D14` rule showing `{{grandTotalF}}`.

**Khen thưởng / rewards (`isRewards`, `max-width:920px`)** — watermark `K`, eyebrow `Biểu khen thưởng`, caption `theo Quy chế chi tiêu nội bộ 2026`. Grouped by `rewardCategories[].group`; each group label (red mono) then rows grid `90px 1fr 160px`: abbr chip (`#EAE3D0`), full name, `{amount} ₫` (vi-VN grouped). Footnote: `Mức thưởng chia đều theo số tác giả thuộc trường; phân loại của bài báo quyết định danh mục áp dụng.` (Full category table in §7.)

### 4.5 THÔNG BÁO / notifications (`isNotifs`, `max-width:860px`)
Watermark `!`, eyebrow `Bảng nhắc việc`, caption `tự tổng hợp từ dữ liệu sổ`.
Toggle row `Nhận nhắc về` + four `nsToggles` (checkbox glyph `☑`/`☐` + label): `Hạn nộp`, `Chuyển bước`, `Thu chi`, `Chờ lâu` — persisted to `papertrack2.ns`.
If nothing pending → green **`Không có việc gấp ✓`** rubber stamp (`border:3px solid #3E6E45`, `ptStamp`).
**`Khẩn — hạn trong 15 ngày · {{urgentCount}}`** section → 2-col grid of urgent cards (`1.5px #A3382B`, red pushpin dot, 58px red countdown circle, title, italic sub, red Dancing-Script action `mở lịch hội thảo ↗` / `mở special issue ↗`); else `Không có hạn nộp nào trong 15 ngày tới.`
Then two sections (`notifSections`): **`Nhắc việc`** (gold) and **`Theo dõi`** (grey), each a list of rows with a rotated tag pill (`{{tag}}`), title + italic sub, red Dancing-Script action; empty → `Không có mục nào — yên tâm làm việc.` (Tag/logic in §6.)

### 4.6 DỮ LIỆU / data (`isData`, `max-width:860px`)
Watermark `D`, eyebrow `Kho dữ liệu`, caption `tự lưu vào trình duyệt sau mỗi thay đổi`. Two columns:
- **Kiểm kê** — count list: `Bài báo`, `Tạp chí`, `Hội thảo`, `Special Issue / Chương sách`, `Tác giả`, `Danh mục khen thưởng`.
- **Thao tác** — buttons: dark `↓ Xuất file JSON`; ghost `↓ Xuất CSV sổ bài báo (Excel)`, `↓ Xuất sổ Excel — 4 sheet (.xls)`, `↑ Nhập file JSON (thay thế)` (hidden `<input type=file accept=.json>`), `⟳ Khôi phục dữ liệu gốc (25/05/2026)`, red `✕ Xóa toàn bộ dữ liệu`; footnote `Nên xuất file JSON trước khi xóa hoặc thay thế dữ liệu.` (Export formats in §6.)

---

## 5. DETAIL PANELS & MODALS

### 5.1 Paper detail drawer (`hasSel`)
Fixed right `aside`, **440px**, `#F6F0DF`, `border-left:1px #221D14`, `ptPanel` slide-in; dark scrim `rgba(34,29,20,.25)` (`ptFade`, click closes). Header strip (`#EAE0C6`): file-tab `Hồ sơ №{{sel.no}}` + italic `tập hồ sơ công bố` + `✕`.
Body (scroll): a `ptStamp` status stamp pinned top-right (`2.5px solid statusColor`, `mix-blend multiply`); title 21px/600 (right-padded 118px); italic `{venue} · {type}`; rank chip + `nộp {date}`.
- **Lộ trình hồ sơ** (`di chuột để xem ngày`): the 8-step pipeline route — mark `✓`(passed, red)/`●`(current, status color)/blank(future), mono label (current bold in status color), dotted leader, and a hover-revealed date (`[data-rt-row]:hover`). Rejected papers append a `✕ Từ chối` row. Actions: `Chuyển: {nextStatus} →` (if `hasNext`), `Khôi phục — Nộp bài` (if rejected).
- **Chữ ký tác giả** — 2-col grid of avatar + Dancing-Script name (dotted underline, rotated) + italic unit.
- **Khen thưởng dự kiến** — `{{sel.rewardText}}` = `{money} — {catName}` or `Chưa xác định — chọn phân loại`.
- **Biên lai chi phí** — rotated receipt (`.6deg`) with `✂ ─ ─ ─ ─`, rows `APC / Hội nghị / Hiệu đính / khác` + double-rule `Tổng`.
- **Liên kết & lưu trữ** (if any of link/publink/localpath/role/payment): `Vai trò của tôi`, `Thanh toán` (color by `Đã trả`/`Chưa trả`/other), submission link (`↗ trang nộp bài / hệ thống tạp chí`, blue) or plain text, `↗ bản công bố` (green), and a mono `🗀 {localpath}` box.
- Optional **washi-taped handwritten note** (Dancing Script), and mono `DOI: {doi}` (blue).
Footer: dark `✎ Sửa hồ sơ`, ghost red `Từ chối` (if not rejected), ghost grey `Xóa` (confirm dialog).

### 5.2 Catalog detail drawer (`hasCSel`) — journal / conf / si / author
Same shell; header shows `{{cs.tab}} №{{cs.no}}` + `{{cs.tabSub}}`. Author variant renders the name as a huge Dancing-Script heading (36px, `ptInk`) with a floated taped **ẢNH 3×4** photo (DiceBear), a 3-up stat block (`BÀI BÁO / Q1 · Q2 / CÔNG BỐ`), a **Thu chi nội bộ** status chip + `mở sổ thu chi ↗` and per-paper finance rows, and a `Sổ bài báo` linked list (`tác giả chính`/`đồng tác giả`). Journal/conf/si variants render title (21px/600), sub-line, rank chip + note, an optional **countdown circle** (conf/si, `ptStamp`) with `Còn N ngày…`/`Đã qua hạn…` note, a **facts** list (ISSN/IF/publisher/fee/country/website or deadline/date/location/fee), an **applied reward** line, and a **linked papers** list. Footer: dark `✎ Sửa` + red `✕ Xóa` (with type-specific confirm). Row-open swaps to the paper drawer (`openPC`).

### 5.3 Paper modal (`isPaperModal`) — "Ghi vào sổ công bố"
Centered modal, `max-width:880px`, paper texture, double rule. Header: `❧` + title **`Ghi vào sổ công bố`** + `{{paperModalSub}}` (`đăng ký hồ sơ mới…` / `chỉnh sửa hồ sơ đã có…`) + right `SỐ HIỆU №{{pfNo}}` (red number) + `✕`.
Two-column body `1fr 240px`:
- **Left:** `(1) Tên bài báo *` — ruled-paper `<textarea>` (`repeating-linear-gradient` 31/32px, 18px italic 500, `line-height:32px`); live **duplicate warning** (`TRÙNG?` + `{{dupText}}`) when a ≥55%-similar title exists. `(2) Tạp chí / Hội thảo *` — input backed by `<datalist>` of all journal+conf names. `(3) Tiến độ — đóng dấu một ô` — a row of rubber-stamp status toggles (selected: status color, rotated `-1.5deg`, weight 600). `(4) Tác giả ký tên` — Dancing-Script author chips with `✕`, plus an autocomplete input (`<datalist>` of directory names; Enter or exact match adds), hint `chọn từ danh bạ, hoặc gõ tên rồi nhấn Enter`. A taped **`GHI CHÚ KÈM HỒ SƠ`** note input (Dancing Script).
- **Right rail** (dashed red left border): a live **preview stamp** of the current status (`ptStamp`) inside a dashed frame; `Loại` toggles `Tạp chí`/`Hội thảo`; `Ngày nộp` date; `Phân loại` select (`— chọn —` + all reward abbrs) with red Dancing-Script `{{pfRewardHint}}` (`thưởng {money}`); a rotated **Chi phí (₫)** receipt with `APC / Hội nghị / Hiệu đính` number inputs + `Tổng`; `DOI` input.
Footer: `{{formError}}` (red, left), italic `{{todaySigned}}` (`ngày DD tháng MM năm YYYY`), `Hủy`, dark **`✎ Ký & lưu vào sổ`**.

### 5.4 Generic catalog modal (`isCatModal`) — journal/conf/si/author add/edit
`max-width:560px`, `❧` + `{{gTitle}}`/`{{gSub}}`, double rule, 2-col field grid (`gFields`; field 1 spans full width), numbered `(n)` labels, dotted-underline inputs. Footer `{{formError}}` + `Hủy` + dark `Lưu`. Field definitions & titles per type in §7.

### 5.5 Toast (`hasToast`)
Fixed bottom-right, `#221D14`/`#F5F1E6`, mono 11px, `border-left:3px #A3382B`, `4px 4px 0 rgba(163,56,43,.5)` shadow, `rotate(-.5deg)`, `ptUp`; auto-dismiss after 2800ms.

---

## 6. COMPONENTS INVENTORY (reusable primitives)

- **Rank chip:** mono 9.5px, `#6E6142` on `#F1EBDA`, `1px #C9BFA4`, `padding:1px 6px`, `rotate(-1.2deg)`. Value = `p.rank || '—'`.
- **Status stamp:** mono 8.5px uppercase, `1.5px solid statusColor`, `border-radius:3px/7px`, `rotate(±1–1.4deg)`, `mix-blend-mode:multiply`, `opacity:.85`. Larger drawer/modal variants scale up radius & border.
- **Progress dots:** 8 dots (one per pipeline stage), 4.5px, filled `SC[status]` up to current index else `#DDD6C6`.
- **Advance `↦`:** ghost arrow, `opacity .25/.3` → hover `opacity 1; translateX(2px)`; `title=Chuyển sang {next}`; `stopPropagation` then advances status.
- **Countdown circle:** 56–64px round; `{days}`/`✓`, `NGÀY`/`ĐÃ QUA`; urgent(`≤15`)=red fill/white; warn(`≤30`)=cream/red; else cream/ink; past=faint; rotated per `rots`.
- **Tally group:** four `2.5px` sticks + a red `rotate(-22deg)` strike shown only on complete groups of five (`_tally`).
- **Author chip / signature:** Dancing-Script name (`#3A3226`), often dotted underline + slight rotate; settlement/author-drawer variants add avatar.
- **DiceBear avatar:** `https://api.dicebear.com/9.x/{avatarStyle}/svg?seed={name}&backgroundColor=transparent`; empty string when `none`/no name; always `filter:saturate(.75) sepia(.12)`.
- **Stat cell:** mono eyebrow / Instrument-Serif number / italic sub, `border-bottom:1px #D8D0BC`, hover→red.
- **Sticky note & taped photo:** cream card + washi-tape strip; rotated; soft shadow.
- **Wax seal / rubber stamp:** dashed-ring circle or bordered pill, `mix-blend-mode:multiply`, `ptStamp`.
- **Buttons:** *primary* = dark + hard red offset shadow; *ghost-red* = `1px #A3382B` transparent → hover fills red; *ghost-neutral* = `1px #C9C2B2/#221D14`; *text/link* = Spectral-italic or Dancing-Script with dotted/solid underline.
- **Inputs:** transparent, dotted/solid bottom border, focus→`#A3382B`; italic `#B0A890` placeholders; ruled textarea; native `date`/`select`/`datalist`.
- **Tables:** CSS-grid "ledger" rows on the red margin-rule gradient; mono uppercase sortable headers with ` ↓/↑` markers.
- **Pager (`_pager`):** `‹ TỜ TRƯỚC` / page chips (active wrapped in wobble ring) / `TỜ SAU ›`; range text `{noun} {lo}–{hi} trong {n} — tờ {cur}/{pc}`; shows only when >1 page; windowed with `···` when >7 pages.
- **Empty states:** italic `#B0A890`, e.g. `— trống —`, `Không có mục nào — yên tâm làm việc.`

---

## 7. DATA MODEL & REFERENCE TABLES

`localStorage papertrack2.db` = `{ v:3, papers[], journals[], conferences[], specialIssues[], authors[], rewardCategories[] }`.

- **paper:** `{id, title, type('Tạp chí'|'Hội thảo'), venue, rank(free text e.g. "Q2, SSCI"), status, date(ISO), authors[string], costs:{apc,conf,other}, note, doi, link, publink, localpath, role, payment('Đã trả'|'Chưa trả'|…), history:{status→ISO}, fin:{shares:{name:amt}, paid:{name:{amount,date}}, rewardReceived:bool, rewardDate}, apcEntries?:[{amount,status}] }`.
- **journal:** `{id,name,rank,country,web,fee,publisher,issn,impact,note}`.
- **conference:** `{id,name,rank,deadline(ISO),confdate,fee(number),feeText,web,location,note}`.
- **specialIssue:** `{id,name,journal,rank,deadline,type('Special Issue'|'Book Chapter')}`.
- **author:** `{id,name,unit,title,email,orcid?,bank,note}`.
- **rewardCategory:** `{id,name,abbr,group,amount,issn?}`.

**Reward categories (`Quy chế 2026`, verbatim, VND):**
| abbr | name | group | amount |
|---|---|---|---|
| WoS-Q1 | Bài báo WoS (SCIE/SSCI/A&HCI) Q1 | WoS (SCIE/SSCI/A&HCI) | 150,480,000 |
| WoS-Q2 | Bài báo WoS (SCIE/SSCI/A&HCI) Q2 | WoS | 110,880,000 |
| WoS-Q3 | … Q3 | WoS | 80,400,000 |
| WoS-Q4 | … Q4 | WoS | 60,000,000 |
| WoS-NR | Bài báo WoS chưa phân hạng | WoS | 25,200,000 |
| Sco-Q1 | Bài báo Scopus Q1 | Scopus | 90,000,000 |
| Sco-Q2 | Scopus Q2 | Scopus | 70,200,000 |
| Sco-Q3 | Scopus Q3 | Scopus | 50,400,000 |
| Sco-Q4 | Scopus Q4 | Scopus | 20,160,000 |
| Sco-NR | Bài báo Scopus chưa phân hạng | Scopus | 16,800,000 |
| ESCI | Bài báo ESCI/CPCI | ESCI/CPCI | 16,800,000 |
| KY-Sco | Kỷ yếu HNKH danh mục Scopus | Hội thảo / Kỷ yếu | 12,600,000 |
| KY-QT | Bài toàn văn HNKH quốc tế (ISSN/ISBN) | Hội thảo / Kỷ yếu | 5,850,000 |
| KY-VN | Bài toàn văn HNKH trong nước | Hội thảo / Kỷ yếu | 1,800,000 |
| TC-ISSN | Tạp chí quốc tế khác (ISSN) | Tạp chí trong nước & khác | 2,100,000 |
| IUH | Tạp chí KHCN IUH (issn 2525-2267) | Tạp chí trong nước & khác | 5,850,000 |
| TC-VN | Tạp chí trong nước khác (ISSN) | Tạp chí trong nước & khác | 1,800,000 |
| CS-QT | Chương sách quốc tế của NXB uy tín | Chương sách | 25,500,000 |
| SC-QT | Bằng độc quyền sáng chế quốc tế | Sở hữu trí tuệ | 100,800,000 |
| SC-VN | Bằng độc quyền sáng chế trong nước | Sở hữu trí tuệ | 60,000,000 |
| GP-HI | Bằng độc quyền giải pháp hữu ích | Sở hữu trí tuệ | 28,800,000 |
| KDCN | Thiết kế mạch, kiểu dáng công nghiệp | Sở hữu trí tuệ | 14,400,000 |
| QTG | Giấy chứng nhận đăng ký quyền tác giả | Sở hữu trí tuệ | 4,800,000 |

**Generic catalog-modal field defs (`gDefs`), labels + placeholders:**
- **journal** ("Thêm tạp chí vào danh mục" / edit "Sửa thông tin tạp chí"): `Tên tạp chí *`(IEEE Access…), `Nhà xuất bản`(Elsevier, Springer…), `Hạng`(WoS-Q1, Sco-Q2…), `ISSN`(0000-0000), `Impact Factor`(5.2), `Quốc gia`(Hà Lan…).
- **conf** ("Thêm hội thảo vào lịch" / "Sửa thông tin hội thảo"): `Tên hội thảo *`, `Địa điểm`, `Hạn nộp bài`(date), `Ngày diễn ra`(date), `Phí tham dự (₫)`, `Hạng kỷ yếu`(KY-Sco, KY-QT…).
- **si** ("Thêm Special Issue" / "Sửa Special Issue"): `Tên số đặc biệt *`, `Tạp chí / NXB`, `Hạng`, `Hạn nộp`(date), `Loại`(Special Issue / Book Chapter).
- **author** ("Thêm tác giả vào danh bạ" / "Sửa thông tin tác giả"): `Họ và tên *`, `Học hàm / học vị`, `Đơn vị`, `Email`, `ORCID`, `Tài khoản ngân hàng`.

---

## 8. BUSINESS LOGIC (from `renderVals()` — exact formulas)

**Pipeline & sheets.** `_PIPE()` = `['Nộp bài','Đang phản biện','Chỉnh sửa','Đánh giá lại','Chấp nhận','Chờ công bố','Công bố','Xét khen thưởng']`. `_sheet(status)`: `Từ chối`→`rejected`; pipeline index 0–4→`inprocess`; ≥5→`finished`.

**Date & money helpers.**
- `_fmtD(iso)` → `DD.MM.YYYY` (else `—`). `todayDots` same format for today.
- `_daysTo(iso)` = `ceil((iso@23:59:59 − now)/86400000)`.
- `_money(n)`: `0 ₫`; `≥1e9`→`x,yy tỷ ₫`; `≥1e6`→`x,y tr ₫` (drops `,0`); else `n.toLocaleString('vi-VN') ₫` (comma decimals, VN grouping).
- `_moneySplit(n)` (for split value/unit): `≥1e9`→{v:`x,yy`,u:`tỷ ₫`}; `≥1e6`→{v:`x,y`,u:`tr ₫`}; else {v:`round(n/1000)`,u:`k ₫`}.
- `_initials(name)`: all-but-last words → first-letter+`.`, keep last word (e.g. `Tran Trong Huynh`→`T.T. Huynh`).

**Aging (`paperExtra`).** Reference date `d0 = history[status] || date`. `age = max(0, floor((today − d0)/86400000))`. `stale = inprocess && age>75`. Display `ageF`: in-process only — `chờ {age} ng` normally, `chờ {age} ng — lâu!` when stale (color red vs `#B0A890`). Advancing sets `history[next]=today` then `status=next` (`_recordStatus` synthesizes prior history if missing).

**Synthetic history (`_synthHistory`).** From `date` as base, cumulative day-gaps `[0,46,102,138,174,200,244,275]` per pipeline step (capped at now). Rejected → `Nộp bài@0`, `Từ chối@72`.

**Dashboard aggregates.**
- `total = all.length`; `inprocCount/rejectedCount` = sheet sizes.
- `published` = count status ∈ {`Công bố`,`Xét khen thưởng`}; `pubPct = round(published/total*100)`.
- `q1`/`q2` = rank contains `Q1`/`Q2` and not rejected; `q12=q1+q2`.
- `rewardEst` = Σ over papers with pipeline index ≥4 of `_catOf(rank,type).amount`. `spent` = Σ `_total(p)` = `apc+conf+other`. `roiX = rewardEst/spent` (both >0); `roiNote='≈ {round} × chi phí!'` only when `≥2`.
- `journalCount`/`confCount` by `type`. `yearNowCount`/`yearPrevCount` by `date` prefix; `yDelta=now−prev` → note `↑ +N bài!`/`↓ −N bài!` (green/red), blank if 0.
- **Sparkline:** 12 months ending current; `sparkCounts[i]=` papers whose `date[0:7]==month`; bar `h = max(round(count/max*100), count?10:4)%`; current month red; `sparkPeakNote='đỉnh T{peakMonth}: {peakCount} bài'`; `sparkTotal=Σcounts`.
- **Unpaid (`Phí chờ thanh toán`):** Σ of `apcEntries[].amount` where `status==='Chưa trả'`; `unpaidN`=count; mark `nhắc nhóm!`/`✓ sạch sổ`.
- **Stages:** counts of first-5 statuses; bar `width=max(count/maxStage*100, 8)%`.
- **Deadlines:** merge conferences + specialIssues with `days≥0`, sort ascending; dashboard shows first 4; urgent≤15/warn≤30 recolor.
- **Tally by rank:** groups `WoS-Q1`, `WoS-Q2`, `Scopus`(rank starts `Sco`), `Khác`; counts exclude rejected.

**Category resolution (`_catOf(rank,type)`).** Exact abbr match first; else parse free-text rank (uppercased): detect `Q1–Q4`; if `type==='Hội thảo'` → `KY-Sco` (if Scopus/Q-tier) else `KY-QT`; if `/SSCI|SCIE|A&HCI/` → `WoS-Q{n}` or `WoS-NR`; else Q-tier → `Sco-Q{n}`; `ESCI`→`ESCI`; `SCOPUS`→`Sco-NR`; then look up that abbr (or `null`).

**Settlement model (fund/quỹ).** For each paper: `n=authors.length`, `cost=_total(p)`, `cat=_catOf`, `rewardExpected = (!manualShares && cat && pipelineIndex≥4) ? cat.amount : 0`. Skip unless there are manual shares, or (`n≥2` and (cost>0 or rewardExpected>0)). `rewardIn = fin.rewardReceived && rewardExpected ? rewardExpected : 0`. **`target = round((rewardIn − cost)/n)`** per author (0 when manual). Per author: `pending = target − alreadyPaid` (manual uses `shares[name]` as target). Sign rules: `pending<0` → **collect** from author (`Cần thu về quỹ`, red); `pending>0` → **pay** author (`Cần chi trả`, green); `==0 && paid≠0` → **settled** (`Đã tất toán`). `net = rewardIn − cost` (or Σ manual shares); `shareText = ±{money}/người`. Slip `hasStamp` = settled or (waiting reward with pendSum 0); slips sorted by `pendSum` desc then `cost+rewardExpected` desc; paged 6. `authAgg[name].pend` = Σ pending across papers → drives the author chips and per-author drawer status. Reward toggle flips `fin.rewardReceived`/`rewardDate`; partial/whole record writes to `fin.paid[name]={amount,date}` (partial via `prompt`, clamped to remaining).

**Author reward estimate.** Per author: Σ over papers (index≥4, author in list) of `cat.amount / max(authors.length,1)` (rounded). Q1/Q2 count and `nPapers` exclude rejected.

**Notifications logic.**
- `urgentList` (`HẠN NỘP`, drives nav badge): deadlines with `days≤15` (only if `ns.deadline`).
- `remindList`: accepted papers (`CHUYỂN BƯỚC`, if `ns.remind`) + deadlines `15<days≤30` (`HẠN NỘP`) + settlement `THU TIỀN`/`CHI TRẢ` rows (if `ns.money`, from `authAgg`).
- `watchList` (`CHỜ LÂU`, if `ns.watch`): `Đang phản biện` papers with `floor((today−date)/day) > 75`.
- `allClear` when urgent+remind+watch all empty.

**Papers filtering/sorting.** Base list by page/sheet; `pfilter` narrows by status; `q` matches title/venue/authors (lowercased `includes`); `psort` toggles asc→desc→off on title/date/rank/status (rank missing sorts last via `'\uffff'`; status by pipeline index). Kanban disabled on `all`; default view from `defaultView` prop.

**Duplicate detection (`_sim`, live in paper form).** Bigram Dice coefficient on NFC-normalized, punctuation-stripped titles; when editing a title >10 chars, best other-paper match with score ≥0.55 shows `Có thể trùng với hồ sơ "{title}" ({round(sc*100)}% giống)`.

**Save/mutate.** New paper id = `max(existing id)+1`; sets initial `history[status]=date||today`. Status change on edit re-records history. `_setDb` deep-clones, mutates, persists. Import auto-detects legacy v2 (`_meta` or string `authors`) and runs `_convertLegacy` (splits author strings, maps costs to `fin.shares/paid`, remaps statuses `Rejected→Từ chối`, `Đang chờ công bố→Chờ công bố`, `Publication→Công bố`, parses DD/MM/YYYY dates).

**Exports.**
- **JSON:** `papertrack-data.json`, pretty-printed full db.
- **CSV:** `papertrack-so-bai-bao.csv`, BOM + CRLF, headers `STT,Tên bài báo,Loại,Nơi đăng,Phân loại,Tiến độ,Ngày nộp,Tác giả,DOI,Chi phí (₫),Thưởng dự kiến (₫)`.
- **Excel (.xls SpreadsheetML):** `papertrack-workbook.xls`, 4 sheets — `Bài báo` (14 cols incl. per-paper `Thưởng dự kiến` when index≥4), `Thu chi nội bộ` (per-author settlement rows), `Tác giả`, `Danh mục khen thưởng`.
- **Reset** re-imports `papertrack-data.js` `DEFAULT_DB` (25/05/2026 snapshot); **Clear** double-confirms and empties everything except `rewardCategories`.

---

### Key file references
- Template & markup: `/private/tmp/claude-501/-Users-quocs-Projects-papertrack/a7f5df71-0eb7-4050-ba82-9caa3a74483d/scratchpad/design-extract/papertrack-redesign/project/PaperTrack.dc.html` — styles/keyframes L12–30; masthead+nav L36–66; dashboard L76–254; papers/kanban L258–378; catalogs L381–532; finance L535–714; notifications L717–786; data L789–820; drawers L826–1075; modals L1078–1221; toast L1224–1226; `renderVals()` L1418–2185.
- Seed data + reward table: `…/project/papertrack-data.js` (papers L4–4005, journals L4006+, conferences L5020+, specialIssues empty L5538, authors L5539+, rewardCategories L5991–6154).