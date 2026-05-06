#!/bin/sh
set -eu

cd /app

if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="file:/data/kraeuterfee.db"
fi

# SQLite-Pfad aus file:… für mkdir (Volume z. B. /data)
db_path="${DATABASE_URL#file:}"
if [ "$db_path" != "$DATABASE_URL" ]; then
  dir=$(dirname "$db_path")
  if [ -n "$dir" ] && [ "$dir" != "." ]; then
    if ! mkdir -p "$dir" 2>/dev/null; then
      echo "[kraeuterfee] WARN: konnte Verzeichnis nicht anlegen: $dir" >&2
    fi
  fi
fi

echo "[kraeuterfee] prisma migrate deploy …"
if ! prisma migrate deploy; then
  echo "[kraeuterfee] FATAL: prisma migrate deploy fehlgeschlagen" >&2
  exit 1
fi

echo "[kraeuterfee] starte Next.js (standalone) …"
exec node server.js
