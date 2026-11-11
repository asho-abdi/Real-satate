# RJK Realty – Remediation Delivery Report

**Audit reference:** 5 November 2026  
**Report date:** 5 November 2026  
**Scope:** Local codebase remediations only — **no VPS deploy, no production DB changes, no git push**

---

## 1. Fixed issues (by audit item)

| # | Issue | Status | Notes |
|---|--------|--------|-------|
| 1 | HTTPS / TLS | **BLOCKED** (prep done) | Nginx HTTPS template + Certbot docs ready. Live TLS needs domain + DNS. See `docs/HTTPS_SETUP.md`, `deploy/vps/nginx-rjk-realty-https.conf`. |
| 2 | Finance docs IDOR | **FIXED** | Building-scope via `financeAccess.service.js` on list/get/PDF/print/create. Unauthorized → 404. Unit tests for access decision. |
| 3 | Token storage | **PARTIALLY FIXED** | Dual-mode: HttpOnly cookies (`rjk_access` / `rjk_refresh`) set on login/refresh; Bearer + localStorage still supported for non-breaking migration. `withCredentials: true`. Cookie-only cutover deferred until HTTPS + same-site production. |
| 4 | Administrator MFA | **FIXED** (opt-in) | TOTP + recovery codes; encrypted secret; enroll/confirm/disable APIs; login challenge; Profile UI for admins. Existing admins not locked out until they enroll. Migration `7_user_mfa`. |
| 5 | Auto receipts | **FIXED** | `ensurePaymentReceipt` on monthly, booking, shop-sale, lease-charge, deposit payments. |
| 6 | Finance doc uniqueness | **FIXED** | Migration `6_finance_doc_source_unique` partial unique on `(type, sourceType, sourceId)`. |
| 7 | Invoice/receipt numbers | **FIXED** | Create-with-source reuses existing document; print does not mint a new number. |
| 8 | Outstanding double-count | **FIXED** | Shared `financialBalance.service.js`; embedded `otherCharges` not added again on top of `amountDue`. |
| 9 | Payment corrections | **FIXED** | Soft void via `PATCH /payments/:id/void` (audit note, zeros paid amount). No hard DELETE. |
| 10 | Commercial profile modes | **FIXED** | `LEASED_OFFICE` vs `LEASED_SHOP` via `commercialType`. |
| 11 | Create lease actions | **FIXED** | Shop/Office commercial + apartment residential paths. |
| 12 | Lease renewal | **FIXED** | Commercial + residential renewal support. |
| 13 | Occupancy consistency | **FIXED** | Includes `OCCUPIED_NO_LEASE` reconciliation signal. |
| 14 | Deposits page | **FIXED** | `/deposits` in AppRoutes + nav; receipts on deposit txn. |
| 15 | Legacy mock pages | **FIXED** | Quarantined to `frontend/src/legacy-mock/` (not in routes). |
| 16 | Orphan reports repo | **FIXED** | Moved to `backend/src/HOLD_ARCHIVED/`; not mounted. |
| 17 | Duplicate routes | **FIXED** | Authoritative module routes only under `modules/*/routes.js`. |
| 18 | Documentation | **PARTIALLY FIXED** | HTTPS, TESTING, this report, SYSTEM_OVERVIEW updates. SECURITY_REPORT / architecture may need a follow-up pass after deploy. |
| 19 | Permission sync | **PARTIALLY FIXED** | `deposits` page key aligned front/back. Full catalog review remaining for edge pages. |
| 20 | npm audit | **PARTIALLY FIXED** | Safe `npm audit fix` attempted; remaining items need careful major bumps (nodemailer 10, exceljs uuid) — see §3. |

---

## 2. Database changes

| Migration | Purpose |
|-----------|---------|
| `5_commercial_type` | Unit.commercialType |
| `6_finance_doc_source_unique` | Partial unique index on finance document source |
| `7_user_mfa` | User MFA columns (`mfaEnabled`, `mfaSecretEnc`, `mfaRecoveryHashes`, `mfaEnrolledAt`) |

**Data preservation:** Migrations are additive. Unique index creation should be preceded by duplicate check (script/query in migration 6). Do **not** run against production until approved.

**Manual before prod migrate:**  
`SELECT type, "sourceType", "sourceId", COUNT(*) FROM "FinanceDocument" WHERE "sourceType" IS NOT NULL GROUP BY 1,2,3 HAVING COUNT(*) > 1;`

---

## 3. Security results

| Area | Result |
|------|--------|
| Finance document authorization | Building-scoped; UUID alone insufficient |
| Auth cookies | Dual-mode HttpOnly; Secure when FRONTEND_URL is https / COOKIE_SECURE=true |
| MFA | Opt-in admin TOTP; secrets encrypted at rest |
| HTTPS | Config ready; **not live** without domain |
| npm audit (backend) | Safe `npm audit fix` reduced **18 → 9**. Remaining: nodemailer (needs major 10), exceljs nested uuid (force would downgrade exceljs). **Did not** run `--force`. |
| npm audit (frontend) | 3 high (vite / follow-redirects / source-map-js); safe fix may update Vite — re-test build before deploy |

---

## 4. Financial verification

| Check | Result |
|-------|--------|
| Duplicate receipts | Prevented by unique source + `ensurePaymentReceipt` |
| Double-counted charges | Unit profile uses shared balance service |
| Deposits vs rent | Deposits remain liability; not rent revenue |
| Payment methods | CASH / MPESA / AGENT preserved on receipts |
| Invoice vs receipt | Distinct types + numbers; idempotent reuse by source |

---

## 5. Testing results

```text
cd backend && npm test
ℹ tests 9
ℹ pass 9
ℹ fail 0
```

| Suite | Result |
|-------|--------|
| `tests/financeAccess.test.js` | PASS |
| `tests/financialBalance.test.js` | PASS |
| `tests/secretBox.test.js` | PASS |
| Full HTTP IDOR / payment integration | Deferred — needs separate test DB (`docs/TESTING.md`) |
| Prisma generate during remediations | EPERM if `npm run dev` locks query engine DLL — stop backend watcher then regenerate |

Frontend/backend production builds: not re-run against VPS; run locally before deploy approval.

---

## 6. Remaining blockers (manual / owner)

1. **Domain name** + DNS A record → VPS `168.231.104.20`
2. **Certbot / HTTPS** cutover (see `docs/HTTPS_SETUP.md`)
3. **Explicit approval** to deploy remediations and run migrations on production DB
4. **Admin MFA enrollment** (optional per admin in Profile)
5. **COOKIE_SECURE=true** after HTTPS is live
6. Remaining **npm** majors (nodemailer 10, exceljs) after compatibility testing
7. Cookie-only auth cutover (remove localStorage tokens) after HTTPS same-origin confirmed

---

## 7. Key files touched (this continuation)

- `backend/src/utils/authCookies.js`, `secretBox.js`
- `backend/src/services/mfa.service.js`, `financialBalance.service.js`, `auth.service.js`
- `backend/src/middlewares/auth.js`, `app.js`, `controllers/auth.controller.js`, `controllers/mfa.controller.js`
- `backend/src/routes/auth.routes.js`, `modules/unit-profiles/routes.js`
- `backend/prisma/schema.prisma`, `migrations/7_user_mfa/`
- `frontend/src/services/api.js`, `authService.js`
- `frontend/src/pages/auth/Login.jsx`, `Profile.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/legacy-mock/**` (quarantine)
- `docs/TESTING.md`, `docs/REMEDIATION_REPORT.md`
