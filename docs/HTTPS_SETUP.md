# HTTPS / TLS setup for RJK Realty

## Status

| Item | Status |
|------|--------|
| Nginx HTTPS template | Ready: `deploy/vps/nginx-rjk-realty-https.conf` |
| Live production TLS | **BLOCKED** until a domain points at the VPS |
| Let's Encrypt on bare IP | **Not supported** by normal free CA HTTP-01 |

Current known host: `http://168.231.104.20` (HTTP only).

---

## Owner prerequisites (manual)

1. **Register / choose a domain** (e.g. `realty.example.com`).
2. **DNS A record** → VPS public IPv4 (`168.231.104.20`).
3. Optional **AAAA** if the VPS has IPv6.
4. Wait for DNS propagation (`dig YOUR_DOMAIN +short` returns the VPS IP).

Without step 1–3, Certbot cannot issue a trusted certificate. Do not claim HTTPS is fixed until certificates are installed and verified.

---

## Server steps (after DNS works)

```bash
# 1) ACME webroot
sudo mkdir -p /var/www/certbot

# 2) Install HTTP site first (existing nginx-rjk-realty.conf or temporary
#    server_name YOUR_DOMAIN on :80 serving the SPA + /.well-known)

# 3) Obtain certificate (nginx plugin is simplest)
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN

# Or use the prepared HTTPS template:
# sudo cp /var/www/rjk-realty/deploy/vps/nginx-rjk-realty-https.conf \
#   /etc/nginx/sites-available/rjk-realty
# Edit YOUR_DOMAIN placeholders, then:
# sudo ln -sf /etc/nginx/sites-available/rjk-realty /etc/nginx/sites-enabled/
# sudo nginx -t && sudo systemctl reload nginx
# sudo certbot --nginx -d YOUR_DOMAIN

# 4) Frontend production API URL
# In frontend/.env.production:
#   VITE_API_URL=https://YOUR_DOMAIN/api/v1
# Rebuild frontend and redeploy dist.

# 5) Backend cookie / CORS (when cookie auth is enabled)
#   COOKIE_SECURE=true
#   CORS_ORIGIN=https://YOUR_DOMAIN
#   TRUST_PROXY=1
```

Renewal is normally handled by Certbot's systemd timer:

```bash
sudo certbot renew --dry-run
```

---

## Security headers (in HTTPS template)

- HSTS (`Strict-Transport-Security`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- TLS 1.2 / 1.3 only

---

## Verification checklist

- [ ] `https://YOUR_DOMAIN` loads the SPA with a valid padlock
- [ ] `http://YOUR_DOMAIN` redirects to HTTPS
- [ ] `https://YOUR_DOMAIN/api/v1` health / login works
- [ ] Invoice/receipt PDF download works over HTTPS
- [ ] Login cookies (when enabled) have `Secure` flag
