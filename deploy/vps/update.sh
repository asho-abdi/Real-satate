#!/usr/bin/env bash
# Safe update of the live RJK Realty server. Keeps all data.
#   1. Backs up Postgres + uploads (aborts if the backup fails)
#   2. Saves any code edited directly on the server as a patch
#   3. Checks out the requested git ref
#   4. npm install -> prisma migrate deploy (never reset) -> build UI
#   5. Restarts the API and checks /health
#
# Usage (on the server, as root):
#   bash deploy/vps/update.sh                       # deploys origin/main
#   REF=origin/feat/rjk-brand-redesign bash deploy/vps/update.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/rjk-realty}"
REF="${REF:-origin/main}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/rjk-realty}"
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"
log() { printf '\n>>> %s\n' "$1"; }

# ---------------------------------------------------------------- 1. Backup
log "Backing up database and uploads to $BACKUP_DIR"
DB_URL="$(grep -E '^DATABASE_URL=' backend/.env | head -1 | cut -d= -f2- | tr -d '"' | sed 's/?.*$//')"
pg_dump --format=custom --no-owner "$DB_URL" > "$BACKUP_DIR/db-$STAMP.dump"
[ -s "$BACKUP_DIR/db-$STAMP.dump" ] || { echo "Database backup is empty - aborting"; exit 1; }
tar -czf "$BACKUP_DIR/uploads-$STAMP.tgz" -C backend uploads 2>/dev/null || true
cp backend/.env "$BACKUP_DIR/backend.env-$STAMP"
chmod 600 "$BACKUP_DIR/backend.env-$STAMP"
echo "Backup: $BACKUP_DIR/db-$STAMP.dump"

# ---------------------------------------------------------------- 2. Server-side edits
if ! git diff --quiet || ! git diff --cached --quiet; then
  log "Server has uncommitted code edits - saving them before updating"
  git diff HEAD > "$BACKUP_DIR/server-edits-$STAMP.patch"
  git stash push --include-untracked -m "server-edits-$STAMP" -- . ':(exclude)backend/uploads' ':(exclude)backend/.env' ':(exclude)frontend/.env.production'
  echo "Saved: $BACKUP_DIR/server-edits-$STAMP.patch (also in git stash)"
fi

# ---------------------------------------------------------------- 3. Code
log "Checking out $REF"
PREV="$(git rev-parse HEAD)"
git fetch origin --prune
git checkout --detach "$REF"
echo "Was $PREV, now $(git rev-parse HEAD)"

# ---------------------------------------------------------------- 4. Install, migrate, build
log "Installing dependencies"
npm install --legacy-peer-deps --no-audit --no-fund

log "Applying database migrations (no data is deleted)"
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..

log "Building the new UI"
npm run build

# ---------------------------------------------------------------- 5. Restart + verify
log "Restarting API"
chown -R www-data:www-data backend/uploads 2>/dev/null || true
systemctl restart rjk-realty-api
sleep 3
for i in 1 2 3 4 5; do
  if curl -fsS http://127.0.0.1:5000/health >/dev/null; then
    systemctl reload nginx
    log "Deployed $(git rev-parse --short HEAD) - API healthy"
    echo "Rollback if needed:"
    echo "  git checkout --detach $PREV && npm install --legacy-peer-deps && npm run build && systemctl restart rjk-realty-api"
    echo "  pg_restore --clean --if-exists --no-owner -d \"\$DB_URL\" $BACKUP_DIR/db-$STAMP.dump   # only if data must be restored"
    exit 0
  fi
  sleep 3
done

echo "API did not become healthy. Logs:"
journalctl -u rjk-realty-api -n 60 --no-pager
exit 1
