# ─── PaperTrack — single image serving API + built SPA ───────────────────────
# Build context = repo root.
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app

# ── Install deps (cached on manifests) ──
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# ── Build shared → web → api ──
FROM deps AS build
COPY . .
RUN pnpm build

# ── Runtime ──
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3100
WORKDIR /app
# Bring over the whole built workspace (node_modules is pnpm-hoisted at root).
COPY --from=build /app ./
EXPOSE 3100
CMD ["sh", "apps/api/docker-entrypoint.sh"]
