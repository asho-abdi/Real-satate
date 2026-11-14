# Deploy RJK Realty on a VPS

Recommended layout on Ubuntu 22.04 / 24.04:

```
/var/www/rjk-realty/          # git clone / upload
  backend/.env                # production secrets (not in git)
  frontend/dist/              # built UI
```

Domains (example):

| Host | Points to |
|------|-----------|
| `app.your-domain.com` | Nginx → `frontend/dist` |
| `api.your-domain.com` | Nginx → Node on `127.0.0.1:5000` |

---

## A. Prepare the server (once)

SSH in as root, then:

```bash
# upload this repo, or:
# git clone <your-repo-url> /var/www/rjk-realty
cd /var/www/rjk-realty
sudo bash deploy/vps/setup-server.sh
```

Change the Postgres password created by the script (`CHANGE_ME_DB_PASSWORD`).

---

## B. Backend env

```bash
cd /var/www/rjk-realty
cp backend/.env.production.example backend/.env
node scripts/generate-secrets.js
# paste JWT_* and SEED_ADMIN_PASSWORD into backend/.env
nano backend/.env
```

Set at least:

```env
NODE_ENV=production
PORT=5000
APP_URL=https://api.your-domain.com
FRONTEND_URL=https://app.your-domain.com
CORS_ORIGINS=https://app.your-domain.com
DATABASE_URL=postgresql://rjk:YOUR_DB_PASSWORD@127.0.0.1:5432/Realstate?schema=public
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
SEED_ADMIN_EMAIL=admin@your-domain.com
SEED_ADMIN_PASSWORD=...
```

Validate:

```bash
node scripts/check-prod-env.js
```

---

## C. Install, migrate, seed

```bash
cd /var/www/rjk-realty
npm install --legacy-peer-deps
cd backend
npx prisma generate
npx prisma migrate deploy
# first time only:
npx prisma db seed
# or: node prisma/seed.js
cd ..
```

---

## D. Build frontend

```bash
cp frontend/.env.production.example frontend/.env.production
nano frontend/.env.production
# VITE_API_URL=https://api.your-domain.com/api/v1
npm run build
```

---

## E. Systemd (API process)

```bash
sudo cp deploy/vps/rjk-realty-api.service /etc/systemd/system/
# edit User/WorkingDirectory if your path differs
sudo systemctl daemon-reload
sudo systemctl enable --now rjk-realty-api
sudo systemctl status rjk-realty-api
curl -s http://127.0.0.1:5000/health
```

---

## F. Nginx + HTTPS

```bash
sudo cp deploy/vps/nginx-rjk-realty.conf /etc/nginx/sites-available/rjk-realty
sudo nano /etc/nginx/sites-available/rjk-realty   # set your real domains + paths
sudo ln -sf /etc/nginx/sites-available/rjk-realty /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Point DNS A records for app.* and api.* to this VPS, then:
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.your-domain.com -d api.your-domain.com
```

---

## G. Permissions for uploads

```bash
sudo mkdir -p /var/www/rjk-realty/backend/uploads
sudo chown -R www-data:www-data /var/www/rjk-realty
sudo chmod -R u+rwX /var/www/rjk-realty/backend/uploads
```

---

## Updates later

Look before you deploy (read-only, prints no secrets):

```bash
bash deploy/vps/inspect-server.sh > ~/rjk-inspect.txt
```

Then deploy. The script backs up Postgres + uploads first, saves any code edited
directly on the server as a patch, runs `prisma migrate deploy` (never reset),
rebuilds the UI, restarts the API and checks `/health`:

```bash
REF=origin/main bash deploy/vps/update.sh
```

Backups land in `/var/backups/rjk-realty/`; the script prints rollback commands.

Manual equivalent:

```bash
cd /var/www/rjk-realty
git pull   # or upload a new release
npm install --legacy-peer-deps
cd backend && npx prisma generate && npx prisma migrate deploy && cd ..
npm run build
sudo systemctl restart rjk-realty-api
sudo systemctl reload nginx
```

Invoice / receipt PDFs are A4 by default; add `?format=slip` to
`/api/v1/finance/documents/:id/pdf` for the 80mm thermal slip.

---

## Checklist

- [ ] DNS A records set
- [ ] `backend/.env` production values set
- [ ] Postgres listening / reachable
- [ ] `migrate deploy` OK
- [ ] Admin can sign in
- [ ] HTTPS certificates issued
- [ ] Building managers assigned to buildings
- [ ] Backups scheduled for Postgres + `backend/uploads`

Do **not** run `prisma migrate reset` on this server.
