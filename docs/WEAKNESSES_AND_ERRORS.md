# RJK Realty — Weaknesses & Errors

**Audit date:** 5 Nov 2026  
**Scope:** Live product path (`frontend/` + `backend/`) as deployed to VPS  
**Companion:** [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md) · [SECURITY_REPORT.md](../SECURITY_REPORT.md)

This document lists **known weaknesses, bugs, security gaps, and tech debt**. It is not a feature wishlist — only issues that affect correctness, security, maintainability, or staff trust in the data.

Severity key: **Critical** · **High** · **Medium** · **Low**

---

## Top 5 priorities

1. **HTTPS / TLS** — production still served over plain HTTP on a public IP.  
2. **Finance document building scope (IDOR)** — staff may read another building’s invoices/receipts by UUID.  
3. **Unit Profile vs offices/apartments** — create-lease / labels / renew flows inconsistent with backend.  
4. **Auto-receipts incomplete** — shop sale payments, lease-charge payments, and deposits do not create `FinanceDocument` receipts like rent/bookings do.  
5. **Dead mock pages + orphan report code** — risk of wiring fake UI or broken Prisma queries.

---

## 1. Security

| Sev | Issue | Evidence | Impact |
|-----|--------|----------|--------|
| **Critical** | Production is **HTTP-only** (no TLS on documented live IP) | Nginx template listens on port 80; `SECURITY_REPORT.md` | JWT, passwords, PII can be sniffed; browsers show “Not secure” |
| **High** | Access/refresh tokens in **`localStorage`** | `frontend/src/services/api.js` | Any XSS steals the session |
| **High** | **Finance docs IDOR** — list/get/PDF without building access checks | `backend/src/modules/finance-docs/routes.js` | Staff with `payments:read` who know/guess IDs can read other buildings’ docs |
| **High** | No **MFA** for admin | Product gap | Stolen admin password = full control |
| **Medium** | **npm audit** — backend ~18 issues (incl. critical/high in transitive deps); frontend ~3 high (Vite chain) | `npm audit` workspaces | Known CVEs in Node process / tooling |
| **Low** | Public IP documented in repo | `SECURITY_REPORT.md` | Aids recon (not a secret by itself) |

**Partially mitigated already:** file/document/work-project IDOR fixes, upload magic-byte checks, Swagger off in production, session revoke on privilege change (see `SECURITY_REPORT.md`).

---

## 2. Data integrity & finance correctness

| Sev | Issue | Evidence | Impact |
|-----|--------|----------|--------|
| **High** | Orphan **reports repository** uses Prisma models that **do not exist** in current schema (`invoice`, `payment`, `lease`, etc.) | `backend/src/modules/reports/repository.js` — **not** mounted, but dangerous if reconnected | Runtime crashes or wrong KPIs |
| **Medium** | No DB **unique** on `(FinanceDocument.type, sourceType, sourceId)` | Schema has index only; dedupe is app-level `findFirst` | Race: concurrent print + payment can create duplicate receipts |
| **Medium** | Manual **invoice** print vs auto **receipt** for same month | `financeDocs.js` vs `ensurePaymentReceipt` | Two document numbers for one economic event — confusing for staff |
| **Medium** | Outstanding can **double-count** if rent line embeds `otherCharges` **and** separate `LeaseCharge` rows exist | Unit profile financial totals + outstanding report | Inflated balances |
| **Medium** | Auto **RECEIPT** missing for shop-sale payments, lease-charge payments, deposits | `shop-sales`, `lease-charges`, `deposits` modules | Incomplete official paper trail vs rent/bookings |
| **Low** | Duplicate month rent → Prisma unique → 409; no friendly upsert from Unit Profile | `payments/routes.js` | Staff must edit existing month, not always obvious |
| **Low** | Soft-delete inconsistency (`LeaseCharge` soft-deleted; `MonthlyPayment` not) | Schema | Harder corrections / history semantics |

---

## 3. UX / functional bugs

| Sev | Issue | Evidence | Impact |
|-----|--------|----------|--------|
| **High** | Active commercial lease always `profileMode = 'LEASED_SHOP'` | `unit-profiles/routes.js` | Offices look like shops in profile mode |
| **High** | Unit Profile **Create lease** UI only when `usage === 'SHOP'`, while backend allows OFFICE (and apartment path wrong) | `UnitProfile.jsx` vs `buildActions` | Offices can’t create lease from profile UI; apartments would incorrectly hit business API if wired |
| **Medium** | Renew lease only for `BUSINESS` kind | `UnitProfile.jsx` | Apartment renew blocked in UI |
| **Medium** | Occupied unit with no *active* lease can show as **VACANT** | `unit-profiles/routes.js` | Wrong actions/badges when data is inconsistent |
| **Low** | Legacy mock **Invoices** / notifications not on main routes but still in tree | `pages/finance/Invoices.jsx`, `NotificationContext` | Confusing if opened accidentally |

---

## 4. Tech debt

| Sev | Issue | Evidence | Impact |
|-----|--------|----------|--------|
| **High** | Dozens of pages still import **`remsData.js`** mocks; not in `AppRoutes` | Grep under `frontend/src/pages` | Duplicate UIs; risk of shipping fake data |
| **Medium** | Duplicate unused route files (`payments.routes.js`, `reports.routes.js`, old controller/repository) | `backend/src/modules/*` | Accidental remount breaks production |
| **Medium** | README role list ≠ seeded roles | `README.md` vs `prisma/seed.js` | Wrong onboarding expectations |
| **Medium** | `docs/architecture.md` still shows Next.js topology | Docs drift | Misleading for new developers |
| **Low** | Frontend/backend `pageAccess` catalogs must be kept in sync manually | Two files | Staff page grants can diverge from API |

---

## 5. Missing / incomplete product pieces

| Sev | Issue | Notes |
|-----|--------|--------|
| **High** | Receipt automation incomplete (sale / charge / deposit) | See §2 |
| **Medium** | `payments:delete` permission exists; active payments API has no DELETE | Corrections require DB or workarounds |
| **Medium** | Deposits API exists; no first-class page in `AppRoutes` | Feature half-shipped for staff |
| **Low** | No Argon2 / HttpOnly cookies / MFA | Enterprise checklist |

---

## 6. Ops & deploy

| Sev | Issue | Notes |
|-----|--------|--------|
| **Critical** | Cannot get free certs on bare IP — needs domain + Certbot | Blocks proper HTTPS |
| **Medium** | Deploy nginx template is HTTP-only by default | Easy to forget TLS when adding a domain |
| **Medium** | Dependency CVEs may ship if deploy skips `npm audit` remediation | See §1 |
| **Low** | Activity logging swallows errors silently | Audit trail can go missing without alerts |

---

## 7. Testing gaps

| Exists | Missing |
|--------|---------|
| `backend/scripts/test-rbac.js`, `security-checks.mjs` | No Jest/Vitest suite, no CI tests for payments, statements, finance idempotency, Unit Profile |

---

## 8. What is solid (for balance)

- Modular Express domains map cleanly to real operations.  
- Prisma schema matches mixed-use product (guest, residential, commercial rent + sale).  
- Building-scoped access on most operational modules.  
- Monthly rent uniqueness; payment methods CASH/MPESA/AGENT with validation.  
- Idempotent receipt generation for **monthly rent** and **booking** payments.  
- Unified Commercial Spaces UI with `commercialType` migration and preserved history.  
- Statements with opening/closing balances from live ledgers.  
- Print/Download invoices & receipts (Share removed by design).  
- Deploy scripts, env validation, security report with prior remediations.

---

## 9. Suggested fix order

| Order | Work |
|-------|------|
| 1 | Domain + HTTPS (Certbot) + redirect HTTP→HTTPS |
| 2 | Add building/unit authorization on all `/finance/documents*` routes |
| 3 | Align Unit Profile create/renew/labels for OFFICE + APARTMENT |
| 4 | Call `ensurePaymentReceipt` (or equivalent) for shop-sale & lease-charge payments; unique constraint on finance source |
| 5 | Quarantine/delete `remsData` pages and orphan `reports/repository.js` |
| 6 | Move tokens to HttpOnly cookies; plan MFA for admins |
| 7 | Add automated tests for payment + statement + commercial registration |

---

## 10. Change log for this audit

| Date | Note |
|------|------|
| 2026-11-05 | Initial audit after Commercial Spaces unification, statements, payment methods, finance docs, Share removal |
| 2026-11-05 | Remediation pass: see `docs/REMEDIATION_REPORT.md` (IDOR, receipts, MFA opt-in, cookie dual-mode, deposits UI, mock quarantine, tests). HTTPS still blocked on domain. |
