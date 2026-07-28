# Supabase Setup

This project uses **Supabase** as the backend and PostgreSQL database.

## Architecture

- Database: Supabase Postgres (`supabase/migrations`)
- Auth: Supabase Auth (`auth.users` + `public.profiles`)
- Client: `@supabase/ssr` + `@supabase/supabase-js` in `apps/web`
- RLS: enabled on domain tables (authenticated staff policies; tighten with roles later)

## 1. Create a Supabase project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Copy **Project URL** and **anon public** key from **Project Settings → API**
4. Optionally copy the **service_role** key for server-only admin jobs (never put it in the browser)

## 2. Configure local env

```bash
cp apps/web/.env.example apps/web/.env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Apply the schema

### Option A — Supabase SQL Editor (fastest)

1. Open **SQL Editor** in the dashboard
2. Paste and run [`supabase/migrations/20260728120000_init_real_estate.sql`](../supabase/migrations/20260728120000_init_real_estate.sql)
3. Paste and run [`supabase/seed.sql`](../supabase/seed.sql) for demo inventory

### Option B — Supabase CLI

```bash
npm install
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Then seed:

```bash
npx supabase db execute --file supabase/seed.sql
```

### Option C — Local Supabase

```bash
npm install
npx supabase start
npx supabase db reset
```

Local Studio is usually at `http://127.0.0.1:54323`.

## 4. Run the web app

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Modules still render mock data when env vars are missing or placeholder. Once `.env.local` points at a live project with migrations applied, services in `apps/web/src/services/supabase-data.ts` can load live rows.

## 5. Key tables for current UI modules

| UI module | Tables |
| --- | --- |
| Property Management | `properties`, `buildings`, `floors`, `units`, `unit_categories`, `amenities`, `media_assets` |
| Residential Apartments | `units` (residential), `tenants`, `leases`, `lease_parties` |
| Commercial Properties | `units` (commercial), `businesses`, `leases` |
| Airbnb Management | `units` (short_term), `guests`, `reservations` |
| Dashboard KPIs | aggregate counts across the tables above |

## 6. Auth notes

- New Auth users create a `profiles` row via trigger `handle_new_user`
- Operational tables require an authenticated session under current RLS
- For early demos you can temporarily use the service role on the server, or add broader policies — do not expose the service role to the client

## 7. Next wiring steps

1. Authenticate Supabase MCP in Cursor (if you want agent-managed projects)
2. Add login UI against Supabase Auth
3. Replace remaining mock CRUD in property / apartment / commercial / Airbnb modules with the service helpers
4. Generate typed clients with `npx supabase gen types typescript --linked > apps/web/src/lib/supabase/database.types.ts`