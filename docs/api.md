# Backend API

Node.js Express API for the Real Estate Management System.

## Role in architecture

```text
Frontend (apps/web)
    ↓ HTTP /api/v1
Backend (apps/api)
    ↓ Supabase service client
Postgres schema: real_estate
```

Supabase remains the database and auth provider.  
`apps/api` is the application backend for validated business workflows, KPI aggregation, and future jobs.

## Setup

1. Copy env:

```bash
cp apps/api/.env.example apps/api/.env
```

2. Fill keys from Supabase Dashboard → Project Settings → API:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)

3. Ensure schema `real_estate` is exposed in Dashboard → Settings → API → Exposed schemas.

4. Install and run:

```bash
npm install --legacy-peer-deps
npm run dev:api
```

API base: `http://localhost:4000/api/v1`

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Health + DB connectivity |
| GET | `/dashboard/kpis` | Portfolio KPIs |
| GET/POST | `/properties` | List/create properties |
| GET/PATCH/DELETE | `/properties/:id` | Property detail/update/archive |
| GET/POST/PATCH/DELETE | `/buildings` | Buildings CRUD |
| GET/POST/PATCH/DELETE | `/floors` | Floors CRUD |
| GET/POST/PATCH/DELETE | `/units` | Units CRUD |
| GET/POST/PATCH | `/leases` | Lease management |
| GET/POST/PATCH | `/reservations` | Booking management |
| POST | `/reservations/:id/check-in` | Check-in |
| POST | `/reservations/:id/check-out` | Check-out |
| GET | `/bootstrap/property-management` | Aggregate payload for Property Management UI |
| GET/POST/PATCH | `/tenants` | Tenant records |
| GET/POST/PATCH | `/businesses` | Commercial businesses |
| GET/POST/PATCH | `/guests` | Short-term guests |
| GET/POST/PATCH | `/maintenance` | Maintenance requests |
| GET/POST/PATCH | `/invoices` | Invoices |
| GET/POST/PATCH | `/payments` | Payments |

All successful responses use:

```json
{ "success": true, "data": ... }
```

Errors use:

```json
{ "success": false, "error": { "message": "...", "details": ... } }
```

## Auth

- Optional Bearer token supported now.
- Set `REQUIRE_AUTH=true` to enforce Supabase access tokens on all `/api/v1/*` routes.

## Folder structure

```text
apps/api/src
  app.ts
  server.ts
  config/
  common/
  lib/
  modules/
    health/
    dashboard/
    properties/
    buildings/
    floors/
    units/
    leases/
    reservations/
    tenants/
    businesses/
    guests/
    invoices/
    payments/
    maintenance/
```
