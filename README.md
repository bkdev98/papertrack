<p align="center">
  <img src="docs/assets/papertrack-banner.png" alt="PaperTrack — sổ theo dõi công bố khoa học" width="820" />
</p>

<h1 align="center">PaperTrack</h1>

<p align="center"><em>Sổ theo dõi công bố khoa học — theo dõi bài báo, hạng Q, chi phí và khen thưởng, cho cả khoa, trên một trang giấy.</em></p>

An internal ledger for tracking scientific-publication work for a university IT faculty (IUH · CNTT), styled as a hand-kept archival accounting book: warm paper grain, wax seals, tally marks, rubber-stamp status pills, and rich ink/stamp motion. Vietnamese UI throughout.

Rebuilt full-stack from a Claude-Design prototype: **Hono + TypeScript + Vite + React 19 + Tailwind v4 + Postgres (Drizzle) + Cloudflare R2**, deployable to **Railway**.

## Features

- **Tổng quan** — dashboard: totals, 12-month submission sparkline, Q1/Q2 record, reward estimate, cost spend, processing funnel, upcoming deadlines, rank tally, inventory seal.
- **Sổ bài báo** — papers as a **ledger** and a full drag-and-drop **Kanban** (9-stage pipeline) with optimistic status moves, status filters, search, and aging ("chờ N ng — lâu!").
- **Danh mục** — journals, conferences, special issues, and an author directory with reward estimates.
- **Tài chính** — internal settlement (fund model: who owes / is owed per author), a cost ledger, and the 2026 reward-rate table.
- **Thông báo** — auto-computed reminders (deadlines, step transitions, money, long-waiting reviews).
- **Dữ liệu** — JSON export/import (round-trips the dataset), a styled multi-sheet **Excel (.xlsx)** report (papers ledger, catalog, settlement, costs, reward table), sample reset, clear.
- **Attachments** — upload paper files/PDFs per record (local disk or R2), with inline preview.
- Single shared-password unlock gate.

## Architecture

```
papertrack/
├─ apps/
│  ├─ api/      Hono API + Drizzle schema/migrations/seed + storage driver (local ↔ R2); serves the SPA in prod
│  └─ web/      Vite + React 19 + Tailwind v4 SPA (design system in src/components/ui)
├─ packages/
│  └─ shared/   types, Zod schemas, Vietnamese vocab, reward table, formatters, dashboard/settlement stats
└─ docs/spec/   the design + logic specs the rebuild was driven from
```

The dashboard and settlement numbers are computed by pure functions in `@papertrack/shared` (single source of truth, verified against the reference dataset: 150 papers, 68 published, 29 Q1/Q2, reward 3,32 tỷ, spend 126,5 tr).

## Local development

Prereqs: Node ≥ 22, pnpm 10, Docker (for Postgres).

```bash
pnpm install

docker compose up -d db      # Postgres 16 on host port 5433, database `papertrack_app`

cp .env.example .env         # defaults point at postgres://postgres:postgres@localhost:5433/papertrack_app

pnpm db:migrate              # create tables
pnpm db:seed                 # load the 150-paper dataset

pnpm dev                     # API on :3100, web on :5174 (proxying /api → 3100)
```

Open http://localhost:5174 and unlock with `papertrack` (the default `APP_PASSWORD`).

> Ports are deliberately offset from the usual defaults (Postgres `5433`, API `3100`, web `5174`) so PaperTrack coexists with other local projects.

### Useful scripts

| Command | What |
| --- | --- |
| `pnpm dev` | run api + web in watch mode |
| `pnpm db:migrate` / `db:seed` / `db:reset` | database lifecycle |
| `pnpm db:generate` | generate a new Drizzle migration after a schema change |
| `pnpm typecheck` | typecheck every package |
| `pnpm build` | production build (shared → web → api) |
| `pnpm lint` / `pnpm format` | Biome |

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the Railway + R2 runbook.

## Configuration

All config is environment-driven; see [.env.example](./.env.example). Notably `APP_PASSWORD` (unlock), `SESSION_SECRET` (cookie signing), and the optional `R2_*` block (attachments switch from local disk to R2 automatically when set).

Setting the optional `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) switches the overview sticky note from the built-in deterministic nudge to a Claude-written one, grounded in the computed deadline/aging/fee signals (only publication metadata and counts are sent — never author, contact, or settlement data). Same auto-select pattern as R2: token set → on, unset → local fallback.

---

<p align="center"><em>mã nguồn mở, viết bằng tay ✍️</em></p>
