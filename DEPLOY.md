# Deploying PaperTrack to Railway

PaperTrack ships as a **single web service** (Hono API that also serves the built React SPA) plus a
**Postgres** database. File attachments use local disk by default and **Cloudflare R2** when configured.

## 1. Prerequisites

- A [Railway](https://railway.app) account and the `railway` CLI (`npm i -g @railway/cli`), or the Railway MCP.
- (Optional) A Cloudflare R2 bucket for attachments.

## 2. Create the project

```bash
railway login
railway init                # create a new project
railway add --database postgres   # provision Postgres; sets DATABASE_URL as a service var
```

## 3. Configure environment variables

On the **web service**, set:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | reference the Postgres plugin: `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | `production` |
| `APP_PASSWORD` | the shared unlock password (change from `papertrack`!) |
| `SESSION_SECRET` | a long random string (e.g. `openssl rand -base64 48`) |
| `WEB_ORIGIN` | your Railway URL (same-origin in prod, so optional) |
| `SEED_ON_START` | `true` for the **first** deploy only, then remove it |

> **Enforced in production:** with `NODE_ENV=production` the app **refuses to boot** unless
> `APP_PASSWORD` is changed from the default and `SESSION_SECRET` is a non-default string of
> at least 16 characters. This prevents deploying on the source-visible dev key. If a deploy
> exits immediately, check these two variables in the logs.

Cloudflare R2 (optional — leave unset to use local disk / a Railway volume):

| Variable | Value |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET` | bucket name (e.g. `papertrack`) |
| `R2_PUBLIC_BASE_URL` | optional CDN/public base if the bucket is public |

> Without R2, attachments are written to `STORAGE_LOCAL_DIR` (default `./storage-data`). On Railway that path
> is ephemeral, so **attach a Volume** mounted at e.g. `/app/apps/api/storage-data` and set
> `STORAGE_LOCAL_DIR=/app/apps/api/storage-data`, or use R2.

## 4. Deploy

```bash
railway up          # builds the Dockerfile and deploys
```

The container runs migrations on boot (`docker-entrypoint.sh`). With `SEED_ON_START=true` it also loads the
150-paper dataset once. After the first successful deploy, **remove `SEED_ON_START`** so future deploys don't
reseed (which replaces all data).

Generate a public domain:

```bash
railway domain
```

Open the URL, unlock with `APP_PASSWORD`, and you're in.

## 5. Data management after launch

- **Backup:** in-app → Dữ liệu → *Xuất file JSON* (round-trips the full database, kanban order included).
- **Restore/migrate:** Dữ liệu → *Nhập file JSON* — a full replace-all. Bundles with zero papers are
  rejected so a truncated or partial file can't silently wipe the database.
- **Re-seed the sample data:** set `SEED_ON_START=true` and redeploy, or run `pnpm --filter @papertrack/api db:seed`
  against the production `DATABASE_URL`.

## Notes

- The API binds `PORT` (Railway injects it). Health check: `GET /api/health`.
- Migrations live in `apps/api/drizzle/` and are applied idempotently at startup.
- To change the schema: edit `apps/api/src/db/schema.ts`, run `pnpm db:generate`, commit the new migration.
