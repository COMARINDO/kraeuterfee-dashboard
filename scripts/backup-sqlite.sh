#!/usr/bin/env sh
# SQLite-Backup für Kräuterfee (Host oder Admin-Container).
# Nutzung: Pfad zur kraeuterfee.db als Argument, z. B.:
#   ./scripts/backup-sqlite.sh /var/lib/docker/volumes/.../kraeuterfee.db
# oder aus Coolify: Pfad des gemounteten Volume auf dem Host.
set -eu

DB_FILE="${1:-}"
if [ -z "$DB_FILE" ]; then
  echo "usage: $0 /path/to/kraeuterfee.db" >&2
  exit 1
fi
if [ ! -f "$DB_FILE" ]; then
  echo "error: file not found: $DB_FILE" >&2
  exit 1
fi

STAMP=$(date -u +"%Y%m%dT%H%M%SZ")
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/kraeuterfee-${STAMP}"
BKP="${OUT}.db.tmp"

# SQLite Online-Backup (kurze Locks möglich; App kann weiterlaufen)
sqlite3 "$DB_FILE" ".backup ${BKP}"
mv "${BKP}" "${OUT}.db"
gzip -f "${OUT}.db"
echo "ok: ${OUT}.db.gz"

# Rotation: älteste Backups löschen (nur dieses Namensschema)
ROTATE_KEEP="${ROTATE_KEEP:-14}"
if [ "${ROTATE_KEEP}" -gt 0 ] 2>/dev/null; then
  count=0
  for f in $(ls -t "$OUT_DIR"/kraeuterfee-*.db.gz 2>/dev/null || true); do
    count=$((count + 1))
    if [ "$count" -gt "$ROTATE_KEEP" ]; then
      rm -f "$f"
    fi
  done
fi
