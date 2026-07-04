#!/bin/sh
# Runs DB migrations, optionally seeds, then starts the server.
set -e
cd /app/apps/api

echo "→ Running migrations…"
node dist/db/migrate.js

if [ "$SEED_ON_START" = "true" ]; then
  echo "→ SEED_ON_START=true — seeding database…"
  node dist/db/seed.js
fi

echo "→ Starting PaperTrack…"
exec node dist/index.js
