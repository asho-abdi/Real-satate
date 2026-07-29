# Real Estate Management System

Enterprise real estate SaaS with **Next.js** frontend, **Express** API, and **Supabase** (Postgres + Auth).

## Repository

Remote: [https://github.com/asho-abdi/Real-satate](https://github.com/asho-abdi/Real-satate)

## Stack

- Frontend: Next.js App Router (`apps/web`)
- Backend API: Express + TypeScript (`apps/api`)
- Database / Auth: Supabase Postgres (`supabase/`, schema `real_estate`)
- Shared package: `packages/shared`
- Architecture docs: `docs/`

## Quick start

1. Follow [docs/supabase-setup.md](docs/supabase-setup.md)
2. Configure frontend env:

```bash
cp apps/web/.env.example apps/web/.env.local
```

3. Configure API env:

```bash
cp apps/api/.env.example apps/api/.env
```

4. Install and run (two terminals):

```bash
npm install --legacy-peer-deps
npm run dev:web
npm run dev:api
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`

API details: [docs/api.md](docs/api.md)

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
