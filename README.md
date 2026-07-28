# Real Estate Management System

Enterprise real estate SaaS scaffold with **Next.js** frontend and **Supabase** (Postgres + Auth) backend.

## Repository

Remote: [https://github.com/asho-abdi/Real-satate](https://github.com/asho-abdi/Real-satate)

## Stack

- Frontend: Next.js App Router (`apps/web`)
- Backend / DB: Supabase Postgres + Auth (`supabase/`)
- Shared package: `packages/shared`
- Architecture docs: `docs/`

## Quick start

1. Follow [docs/supabase-setup.md](docs/supabase-setup.md)
2. Copy env:

```bash
cp apps/web/.env.example apps/web/.env.local
```

3. Install and run:

```bash
npm install
npm run dev
```

## Current modules (UI)

- `/` Dashboard
- `/properties` Property Management
- `/apartments` Residential Apartments
- `/commercial-properties` Commercial Properties
- `/airbnb-management` Airbnb / short-term reservations

## Database

Initial migration:

- `supabase/migrations/20260728120000_init_real_estate.sql`

Demo seed:

- `supabase/seed.sql`