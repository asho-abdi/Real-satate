# RJK Realty — production readiness

**Target: VPS (Ubuntu + Nginx + systemd + PostgreSQL)**  
Full server steps: **[deploy/vps/README.md](deploy/vps/README.md)**

This file is the short checklist. It does **not** deploy by itself.

## Quick path (VPS)

1. Provision Ubuntu 22.04/24.04 VPS with a public IP  
2. Point DNS:
   - `app.your-domain.com` → VPS IP  
   - `api.your-domain.com` → VPS IP  
3. On the server: `sudo bash deploy/vps/setup-server.sh`  
4. Put the code in `/var/www/rjk-realty`  
5. Configure `backend/.env` from `.env.production.example` + `npm run prepare:secrets`  
6. `npm install --legacy-peer-deps` → `prisma migrate deploy` → seed  
7. Build UI with `frontend/.env.production`  
8. Enable `rjk-realty-api.service` + Nginx config in `deploy/vps/`  
9. `certbot --nginx` for HTTPS  

## Environment files

| File | Use |
|------|-----|
| `backend/.env.production.example` | Copy → `backend/.env` on the VPS |
| `frontend/.env.production.example` | Copy → `frontend/.env.production` before `npm run build` |

```bash
npm run prepare:secrets   # JWT + admin password values
npm run check:prod-env    # validate backend/.env
npm run prisma:deploy     # apply migrations (no data wipe)
npm run build             # frontend → frontend/dist
npm run start:backend     # local/manual API start (VPS uses systemd)
```

## Required production values

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql://rjk:…@127.0.0.1:5432/Realstate?schema=public` |
| `APP_URL` | `https://api.your-domain.com` |
| `FRONTEND_URL` | `https://app.your-domain.com` |
| `VITE_API_URL` | `https://api.your-domain.com/api/v1` |
| `JWT_*` / `SEED_ADMIN_PASSWORD` | from `prepare:secrets` |

## Do not

- Do not run `prisma migrate reset` on production  
- Do not commit real `.env` files  
- Do not keep the old demo password on the live admin account  

## Files added for VPS

- `deploy/vps/setup-server.sh` — Node, Nginx, Postgres, firewall  
- `deploy/vps/nginx-rjk-realty.conf` — app + API vhosts  
- `deploy/vps/rjk-realty-api.service` — systemd unit  
- `deploy/vps/README.md` — full walkthrough  
