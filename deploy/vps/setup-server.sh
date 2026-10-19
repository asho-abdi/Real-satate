#!/usr/bin/env bash
# Run once on a fresh Ubuntu 22.04/24.04 VPS as root (or with sudo).
# Usage: sudo bash deploy/vps/setup-server.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/rjk-realty}"
NODE_MAJOR="${NODE_MAJOR:-20}"

echo "==> Updating packages"
apt-get update -y
apt-get install -y curl ca-certificates gnupg ufw nginx postgresql postgresql-contrib git

echo "==> Installing Node.js ${NODE_MAJOR}.x"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "==> Firewall (SSH + HTTP/HTTPS)"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable || true

echo "==> App directory ${APP_DIR}"
mkdir -p "${APP_DIR}"
chown -R www-data:www-data "${APP_DIR}"

echo "==> PostgreSQL role/db (edit password after)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='rjk'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER rjk WITH PASSWORD 'CHANGE_ME_DB_PASSWORD';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='Realstate'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE \"Realstate\" OWNER rjk;"

echo ""
echo "Server baseline ready."
echo "Next:"
echo "  1) Clone/upload the repo into ${APP_DIR}"
echo "  2) Follow deploy/vps/README.md (env, migrate, build, systemd, certbot)"
