# RJK Realty — System Overview

**Product:** RJK Realty (property management)  
**Live:** `http://168.231.104.20` (HTTP)  
**Stack:** React + Vite (`frontend/`) · Express + Prisma + PostgreSQL (`backend/`)  
**Last reviewed:** 5 Nov 2026

---

## 1. Purpose

RJK Realty manages a mixed-use portfolio:

| Portfolio area | What it covers |
|----------------|----------------|
| Buildings / floors / units | Setup, availability, unit profiles |
| Apartments | Long-term residential tenants |
| Commercial Spaces | Shops and offices (rentals + sales) — **one** module |
| Guest bookings | Short stays (daily / weekly / monthly) |
| Finance | Payments, outstanding, statements, invoices/receipts, money movements |
| Operations | Maintenance (repairs), working progress (construction) |

---

## 2. Repository layout

```
Real-State/
├── frontend/          # Active SPA (Vite)
├── backend/           # Active API (Express + Prisma)
├── deploy/vps/        # Nginx, systemd templates
├── docs/              # This documentation
├── DEPLOY.md
├── SECURITY_REPORT.md
└── package.json       # npm workspaces
```

**Canonical app code is `frontend/` + `backend/`.**  
Unused REMS-era mock pages are quarantined under `frontend/src/legacy-mock/` and are **not** registered in `AppRoutes.jsx`. Prefer `rentalApi.js` screens only.

Older design docs (`docs/architecture.md`) may still mention Next.js — **runtime is Vite SPA + Express**, not Next.js.

Remediation status: `docs/REMEDIATION_REPORT.md`. HTTPS readiness: `docs/HTTPS_SETUP.md`.

---

## 3. Architecture (runtime)

```
Browser (React SPA)
    │  Dual-mode auth: Bearer (localStorage) + HttpOnly cookies
    ▼
Nginx :80 (HTTPS after domain)  →  static frontend/dist
                                →  /api/v1  →  Node :5000 (Express)
                                                   │
                                                   ▼
                                              PostgreSQL (Prisma)
```

- API prefix: `/api/v1`
- Health: `GET /health`
- Auth: access + refresh JWT; HttpOnly cookies set alongside body tokens; optional admin TOTP MFA
- RBAC via roles + `User.allowedPages` → permission codes
- Building scope: `UserBuilding` filters most operational queries (+ finance documents)

---

## 4. Main modules (API)

| Mount | Domain |
|-------|--------|
| `/auth` | Login, refresh, profile, password, MFA enroll/confirm |
| `/users`, `/roles` | Staff and permissions |
| `/buildings`, `/floors`, `/units`, `/unit-profiles` | Portfolio |
| `/tenants` | Apartment leases |
| `/businesses` | Commercial rentals (shop/office) |
| `/shop-sales` | Sold commercial units |
| `/bookings` | Guest stays + booking payments |
| `/payments` | Monthly rent ledger |
| `/lease-charges` | Extra / owner monthly charges |
| `/deposits` | Security deposits (liability) |
| `/finance` | Statements, invoices/receipts, payment defaults |
| `/expenses` | Money movements |
| `/maintenance`, `/work-progress` | Repairs / construction |
| `/reports`, `/today`, `/settings`, `/search` | Ops & reporting |

---

## 5. Data model (highlights)

| Concept | Models |
|---------|--------|
| Space | `Building` → `Floor` → `Unit` (`usage`: SHOP \| OFFICE \| APARTMENT \| GUEST; `commercialType` for commercial) |
| Residential lease | `Tenant` + `MonthlyPayment` |
| Commercial lease | `Business` + `MonthlyPayment` |
| Commercial sale | `ShopSale` + `ShopSalePayment` |
| Guest | `Booking` + `BookingPayment` |
| Other billing | `LeaseCharge` |
| Documents | `FinanceDocument` (`INV-` / `RCP-` via `DocumentSequence`) |
| Deposits | `SecurityDeposit` + `SecurityDepositTxn` |
| Audit (partial) | `Activity` on unit timeline |

Payment methods (controlled): **CASH**, **MPESA**, **AGENT** (legacy `E_BESA` normalized to MPESA).

---

## 6. Active UI routes

| Path | Feature |
|------|---------|
| `/dashboard`, `/today` | Overview / daily board |
| `/buildings`, `/availability`, `/units/:id` | Setup & unit profile |
| `/apartments` | Residential tenants + statements |
| `/commercial-spaces` | Unified shops & offices |
| `/bookings` | Guest bookings |
| `/payments`, `/outstanding`, `/statements` | Finance |
| `/expenses`, `/reports` | Money & reports |
| `/maintenance`, `/work-progress` | Operations |
| `/users`, `/settings` | Admin |

`/shops` and `/offices` redirect to `/commercial-spaces`.

---

## 7. Key workflows

### Commercial Spaces
1. Filter All / Shop / Office.
2. Register rental or sale; select **commercial type** (persisted as `Unit.commercialType` + `usage`).
3. Record rent via payment calendar; sale installments via sale payments.
4. Open **Statement** per business/buyer.

### Payments
1. Choose Cash / MPESA (office number) / Agent.
2. Method details stored on the payment row.
3. Monthly rent and booking payments can auto-create an idempotent **RECEIPT** (`FinanceDocument`).
4. Print / Download invoice or receipt from booking detail, payments, unit profile.

### Statements
1. Finance → Statements (or from Apartments / Commercial).
2. Optional date range → opening balance, lines, closing balance.
3. Print / Download PDF (no Share).

### Settings
- Company name, currency
- Office MPESA number
- Default agent account name / reference

---

## 8. Roles & access

- Seeded roles typically include **ADMIN** and building staff.
- Staff: `allowedPages` (e.g. `commercial-spaces`, `statements`) expand to API permission codes.
- Admins: full access (`*`).
- Building managers: limited to assigned buildings where filters apply.

Legacy page keys `shops` / `offices` map to `commercial-spaces`.

---

## 9. Deploy

See **[DEPLOY.md](../DEPLOY.md)** and **[deploy/vps/README.md](../deploy/vps/README.md)**.

Typical VPS path: `/var/www/rjk-realty`, systemd `rjk-realty-api`, Nginx static + proxy.  
Prisma migrations run on deploy (`migrate deploy`).

---

## 10. Related docs

| Doc | Content |
|-----|---------|
| [WEAKNESSES_AND_ERRORS.md](./WEAKNESSES_AND_ERRORS.md) | Known weaknesses, bugs, security gaps |
| [backend-api.md](./backend-api.md) | API reference (may lag new finance routes) |
| [database-design.md](./database-design.md) | Schema notes |
| [../SECURITY_REPORT.md](../SECURITY_REPORT.md) | Security findings & mitigations |
| [../DEPLOY.md](../DEPLOY.md) | Production deploy |

---

## 11. Local development

```bash
# From repo root
cp backend/.env.example backend/.env   # set DATABASE_URL
npm install --legacy-peer-deps
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run start:backend                  # :5000
npm run dev:frontend                   # :5173
```
