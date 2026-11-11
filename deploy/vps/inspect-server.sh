#!/usr/bin/env bash
# Read-only snapshot of the live RJK Realty server. Changes nothing.
# Usage (on the server):  bash deploy/vps/inspect-server.sh > ~/rjk-inspect.txt
# Never prints secrets: .env values are not shown, only which keys exist.
set -uo pipefail

APP_DIR="${APP_DIR:-/var/www/rjk-realty}"
cd "$APP_DIR" || { echo "App dir $APP_DIR not found"; exit 1; }

section() { printf '\n==================== %s ====================\n' "$1"; }

section "Host"
hostname; uname -sr; date -Is
node -v 2>/dev/null; npm -v 2>/dev/null; psql --version 2>/dev/null
df -h "$APP_DIR" | tail -1

section "Git: where the server code is"
git rev-parse --abbrev-ref HEAD 2>/dev/null
git log --oneline -5 2>/dev/null
git remote -v 2>/dev/null | head -2

section "Git: files edited directly on the server (not committed)"
git status --short 2>/dev/null | grep -v '^?? backend/uploads' | head -100

section "Git: diff of server-side edits (code only)"
git diff --stat 2>/dev/null | tail -40
git diff -- . ':(exclude)*.env' ':(exclude)package-lock.json' 2>/dev/null | head -400

section "Git: commits on GitHub not yet on the server"
git fetch --quiet origin 2>/dev/null && git log --oneline HEAD..origin/main 2>/dev/null | head -40

section "Env keys present in backend/.env (values hidden)"
[ -f backend/.env ] && grep -E '^[A-Z_]+=' backend/.env | cut -d= -f1 | sort | tr '\n' ' '; echo

section "Database migrations applied in production"
if [ -f backend/.env ]; then
  DB_URL="$(grep -E '^DATABASE_URL=' backend/.env | head -1 | cut -d= -f2- | tr -d '"' | sed 's/?.*$//')"
  psql "$DB_URL" -Atc 'select migration_name, finished_at from "_prisma_migrations" order by started_at' 2>&1 | tail -20

  section "Row counts (data that must survive the deploy)"
  for t in User Building Floor Unit UnitImage Tenant Business Booking BookingPayment MonthlyPayment LeaseCharge Expense ShopSale MaintenanceRecord WorkProject FinanceDocument SecurityDeposit EntityDocument Setting; do
    printf '%-18s ' "$t"; psql "$DB_URL" -Atc "select count(*) from \"$t\"" 2>/dev/null || echo "(no table)"
  done
fi

section "Uploads"
du -sh backend/uploads 2>/dev/null; find backend/uploads -type f 2>/dev/null | wc -l

section "Services"
systemctl is-active rjk-realty-api 2>/dev/null; systemctl is-active nginx 2>/dev/null
curl -s -o /dev/null -w 'API health HTTP %{http_code}\n' http://127.0.0.1:5000/health
ls -la frontend/dist 2>/dev/null | head -5
