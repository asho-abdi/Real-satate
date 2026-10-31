# RJK Realty — Security Report

**Date:** 2026-10-20  
**Scope:** Application codebase (`backend/`, `frontend/`, `deploy/vps/`) plus known production deployment on Hostinger VPS (`168.231.104.20`).  
**Stance:** Highest *practical* hardening without destroying data, locking out the admin, or inventing HTTPS for a bare IP.

This report does **not** claim the system is fully secure. It documents confirmed issues, fixes applied, verification performed, and remaining risks that need owner action (especially DNS/HTTPS and VPS SSH hardening).

---

## 0. Follow-up from independent audit

An additional code review ([Security audit](efcb5294-00a7-4d74-b834-38d0b2790d64)) confirmed further IDOR gaps. These were fixed in a follow-up pass:

| Finding | Fix |
|---------|-----|
| Work-projects cross-building IDOR | Building scope on list/summary/get/mutate + nested section/record asserts |
| Lease-charges list IDOR | `unitBuildingFilter` on `GET /` |
| Expenses null-`buildingId` ACL bypass | Unscoped rows admin-only; building required for staff creates |
| `allowedPages` not persisted in session | Stored on login/`/me`/refresh; `ProtectedRoute` enforces page access |
| Prisma `P2002` meta leak | Stripped in production |
| Swagger example credentials | Replaced with placeholders |

---

## 1. Executive summary

| Area | Status |
|------|--------|
| Server-side RBAC + building scope | Present and reinforced (page access → permissions; building filters) |
| Auth (JWT + refresh rotation) | Hardened (rate limits, password policy, audit events, session revoke on privilege change) |
| File upload / download IDOR | **Fixed** (authz + building checks + magic-byte validation) |
| Swagger in production | **Fixed** (disabled when `NODE_ENV=production`) |
| Transport (HTTPS) | **Not complete** — app still served over HTTP on a public IP; needs a domain + TLS |
| MFA for admins | **Not implemented** (documented as remaining high priority) |
| Argon2id password hashing | **Not migrated** — bcrypt (cost 12) retained with dual-path left for future |
| Tokens in `localStorage` | **Remaining XSS risk** — documented; HttpOnly cookie migration is a larger auth redesign |

**Critical production gap:** the live dashboard is reachable as `http://168.231.104.20` (“Not secure”). A publicly trusted certificate cannot be issued for a bare IP in the usual free-CA workflow. Owner must provide a DNS domain before production HTTPS.

---

## 2. Confirmed vulnerabilities (pre-fix) and remediation

### CRITICAL / HIGH

| ID | Finding | Evidence | Severity | Remediation | Verification |
|----|---------|----------|----------|-------------|--------------|
| H1 | Unauthenticated/under-authorized file upload on `POST /api/v1/files/documents` (auth only, no permission) | `backend/src/modules/files/routes.js` | High | Require `units:update` + magic-byte validation | Code review |
| H2 | Document download IDOR: any user with `units:read` could fetch another building’s file by filename | `files/routes.js` GET `/:category/:filename` | High | Resolve `EntityDocument` / unit and call `assertUnitBuildingAccess` | Code review |
| H3 | Document list could return cross-building rows | `documents/routes.js` GET `/` | High | Scope query with `unit.buildingId ∈ user.buildingIds` | Code review |
| H4 | Cleartext HTTP on public IP | Live site / nginx listen 80 | Critical (transport) | Domain + Certbot + HSTS *after* HTTPS works | **Blocked on DNS** — see §7 |
| H5 | Swagger UI exposed at `/api/docs` | `app.js` always mounted docs | High | Mount only when `!isProduction` | Code review |

### MEDIUM

| ID | Finding | Evidence | Severity | Remediation | Verification |
|----|---------|----------|----------|-------------|--------------|
| M1 | Upload validation trusted client MIME only | `middlewares/upload.js` | Medium | Magic-byte checks in `utils/fileMagic.js` | Unit checks |
| M2 | Weak password minimum (8 chars, no complexity) | `validators/auth.validators.js` | Medium | Policy: ≥10, upper/lower/digit/special | `security-checks.mjs` |
| M3 | Auth rate limit relatively loose (20/15m) | `rateLimiter.js` | Medium | Login 10/15m; forgot-password 5/hour | Code review |
| M4 | Role/page changes did not revoke refresh sessions | `users/routes.js` PATCH | Medium | `revokeAllUserRefreshTokens` on role/pages/buildings/password change | Code review |
| M5 | Profile update accepted raw body (mass-assignment risk) | `auth.service.js` `updateProfile` | Medium | Explicit allowlist (`firstName`, `lastName`, `phone`, `name`) | Code review |
| M6 | Health endpoint leaked `NODE_ENV` string | `app.js` `/health` | Low–Med | Coarse `production` / `non-production` only | Code review |

### LOW / INFORMATIONAL

| ID | Finding | Notes |
|----|---------|-------|
| L1 | Access/refresh tokens stored in `localStorage` | XSS → token theft. Prefer HttpOnly Secure cookies in a future auth redesign. |
| L2 | bcryptjs instead of Argon2id | Acceptable today (cost 12); plan Argon2id with dual verify + rehash. |
| L3 | No MFA | Required for enterprise admin accounts; not shipped in this pass. |
| L4 | CORS allows empty Origin | Needed for mobile/non-browser clients; production origins still allowlisted. |
| L5 | Nginx example still uses `example.com` | Live host uses IP vhost; TLS pending domain. |

### Already in good shape (baseline)

- Prisma ORM (parameterized) — no `$queryRaw` abuse found in app routes.
- Generic login errors (“Invalid email or password”).
- Forgot-password does not reveal account existence.
- Reset tokens hashed at rest, 1h expiry, single-use clear, refresh revoke on reset.
- Helmet enabled; production error handler strips stacks for 5xx.
- JWT secrets rejected if weak/short in production (`env.js`).
- Building access helpers used widely on resource routes.
- Admin-only user management (`requireAdmin` + `users:*` permissions).

---

## 3. Files changed (this hardening pass)

| File | Why |
|------|-----|
| `backend/src/app.js` | CSP/referrer/HSTS-gated helmet; CORS methods; smaller body limits; hide swagger in prod; quieter health |
| `backend/src/middlewares/rateLimiter.js` | Stricter auth + dedicated password-reset limiter |
| `backend/src/routes/auth.routes.js` | Apply reset limiter |
| `backend/src/validators/auth.validators.js` | Strong password rules |
| `backend/src/utils/passwordPolicy.js` | Shared password policy |
| `backend/src/utils/fileMagic.js` | Magic-byte validation |
| `backend/src/modules/files/routes.js` | Authz + IDOR-safe downloads |
| `backend/src/modules/documents/routes.js` | Building-scoped list + safe upload |
| `backend/src/services/auth.service.js` | Auth audit events; password policy; profile allowlist |
| `backend/src/modules/users/routes.js` | Password policy; self-role change block; session revoke; audit |
| `backend/scripts/security-checks.mjs` | Offline security unit checks |
| `SECURITY_REPORT.md` | This document |

Related earlier work (still relevant): per-user `allowedPages`, building assignment UI, permission expansion in `access.service.js`.

---

## 4. Security controls implemented

1. **Least-privilege page access** — staff permissions derived from allowed pages (backend enforced).
2. **Building isolation** — document listing/download assert building membership.
3. **Upload hardening** — MIME + magic bytes; authz on upload.
4. **Auth abuse controls** — tighter rate limits; password complexity; login/reset audit events.
5. **Session invalidation** — refresh tokens revoked when admin changes role, pages, buildings, or password.
6. **Attack surface reduction** — Swagger off in production.
7. **Safer defaults** — smaller JSON bodies, `extended: false` urlencoded, nosniff on file responses.

---

## 5. Commands and tests actually executed

```text
node backend/scripts/security-checks.mjs
```

**Result (local):** all offline checks passed (password policy, page→permission expansion, magic-byte detection).

Not executed in this pass (require controlled fixtures / owner approval):

- Full live IDOR penetration against production data.
- Destructive dependency `npm audit fix --force`.
- VPS firewall / SSH key-only lockdown.
- Certbot HTTPS (blocked without domain).

Existing script `backend/scripts/test-rbac.js` remains available for building-scope smoke tests against a running API with fixture users.

---

## 6. Remaining risks and external prerequisites

### Must have for production-grade transport

1. **A DNS domain** you control (e.g. `app.rjkrealty.com` + `api.rjkrealty.com` **or** a single host with path-based API).
2. Point A records to `168.231.104.20`.
3. On the VPS (after DNS propagates):
   - Install Certbot nginx plugin.
   - Issue certificates for those hostnames.
   - Force HTTP→HTTPS redirect.
   - Set `FRONTEND_URL` / `APP_URL` / `CORS_ORIGINS` / `VITE_API_URL` to `https://…`.
   - Rebuild frontend and restart API.
4. Only then enable long-lived HSTS (already gated on `FRONTEND_URL` starting with `https://`).

**Do not** expect Let’s Encrypt to issue for the bare IP alone.

### Recommended next hardening (owner approval)

| Item | Risk if deferred |
|------|------------------|
| MFA for Admin | Stolen password → full takeover |
| Migrate tokens to HttpOnly Secure cookies | XSS can steal Bearer tokens from `localStorage` |
| Argon2id hashing with bcrypt verify fallback | Weaker against offline GPU cracking |
| SSH: create sudo user → key auth → disable password/root login | VPS compromise via password guessing |
| Firewall default-deny; allow 22/80/443 only from needed sources | Wider attack surface |
| Encrypted off-box backups + restore drill | Ransomware / disk failure |
| Dependency audit + careful upgrades | Supply-chain CVEs |
| Malware scanning for uploads | Malicious PDF/Office payloads |

### Environment variables (names only)

`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `APP_URL`, `CORS_ORIGINS`, `NODE_ENV`, `PORT`, `SMTP_*`, `SEED_ADMIN_*`, `VITE_API_URL`.

Never commit real values. Production secrets must remain only in `backend/.env` on the server with restricted filesystem permissions.

---

## 7. HTTPS / DNS setup requirements (owner)

Provide:

1. Registered domain name.
2. Ability to create DNS A (and optionally AAAA) records.
3. Confirmation whether you want:
   - **Option A:** `app.` + `api.` subdomains, or  
   - **Option B:** single host (`realty.example.com`) with `/api` proxied to Node.

Until then, keep treating the IP HTTP endpoint as **temporary / not production-grade**.

---

## 8. VPS hardening steps requiring owner approval

Do **not** run these blindly (risk of lockout):

1. Create non-root sudo user; copy SSH keys; verify second session.
2. Disable root SSH login and password authentication.
3. `ufw default deny incoming`; allow OpenSSH + 80/443; enable.
4. Fail2ban for sshd.
5. Unattended security upgrades with monitoring.
6. Confirm Postgres listens on `127.0.0.1` only.
7. Confirm `backend/.env` is `chmod 600` and owned by the service user.
8. Ensure systemd service does not run as root if avoidable (`www-data` / dedicated user).

---

## 9. Deployment, verification, rollback

### Deploy application security fixes

1. Backup: DB dump + copy of `backend/.env` + `backend/uploads`.
2. Upload changed backend/frontend sources.
3. `npx prisma migrate deploy` (only additive migrations).
4. `npm run build` for frontend if UI changed.
5. `systemctl restart rjk-realty-api`.
6. Health check: `curl http://127.0.0.1:5000/health`.
7. Smoke: login, open a building-scoped page, download an authorized document, confirm unauthorized building document 403/404.

### Rollback

1. Restore previous code tarball.
2. Restore `.env` if changed.
3. Restart API.
4. Do **not** roll back additive migrations unless you have a tested down migration (this pass did not add a new migration).

---

## 10. Acceptance criteria mapping

| Criterion | Status |
|-----------|--------|
| Critical/high app vulns fixed or documented | Mostly fixed; **HTTPS open** documented |
| Server-side authz on protected ops | Enforced; file/doc gaps closed |
| Cross-building isolation | Reinforced for documents/files |
| No self privilege escalation via ordinary requests | Profile allowlist + self-role block |
| HTTPS configured or prerequisites clear | Prerequisites clear (§7) |
| Secrets not in source/frontend | No secrets added; tokens still client-held (risk noted) |
| DB/upload/session/API protections verified | Offline tests + code review; live pen-test optional |
| Workflows/data intact | No destructive DB ops |
| Deploy/rollback procedure | §9 |

---

## 11. Honest limitations

- No full automated penetration suite was run against production.
- MFA, Argon2id, and cookie-based sessions are **not** done.
- Unit image download path still best-effort when image URLs are not indexed on a unit row.
- Malware scanning is not installed.
- VPS OS/SSH/firewall changes await explicit owner approval to avoid lockout.

**Next recommended owner actions:** (1) provide domain for HTTPS, (2) approve SSH/firewall hardening plan, (3) enable MFA project for Admin.
