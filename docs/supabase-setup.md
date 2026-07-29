# Supabase Setup

This project uses **Supabase** as the backend and PostgreSQL database.

## Important: schema isolation

The connected Supabase project already contains an older **travel** app in the `public` schema.

The Real Estate system was applied into a dedicated schema:

**`real_estate`**

This avoids collisions with existing tables such as `public.users`, `public.permissions`, and `public.audit_logs`.

Next.js clients are configured with:

```ts
db: { schema: "real_estate" }
```

### Expose the schema in Supabase API settings

In the Supabase Dashboard:

1. Open **Project Settings → API**
2. Under **Exposed schemas**, include `real_estate` (keep `public` if needed)
3. Save / reload

Without this, PostgREST cannot serve `real_estate.*` to the JS client.

## Project already provisioned

- Project URL: `https://mdathdtmsiwwgbxgponu.supabase.co`
- Migration applied via MCP: `init_real_estate_schema`
- Demo seed loaded: 4 properties, 4 buildings, 4 units, 2 leases, 1 reservation, 1 maintenance request

## Local env

```bash
cp apps/web/.env.example apps/web/.env.local
```

Then set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://mdathdtmsiwwgbxgponu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Dashboard → Settings → API>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Security advisory (existing public schema)

Many existing `public.*` travel tables currently have **RLS disabled**. That is a critical exposure risk for that legacy schema. Do **not** enable RLS blindly without policies (it would lock the travel app). Review and remediate separately:

- Docs: https://supabase.com/docs/guides/database/postgres/row-level-security

The new `real_estate.*` tables have RLS enabled with temporary demo policies (authenticated full access + anon read). Tighten those before production.

## Run the app

```bash
npm install --legacy-peer-deps
npm run dev
```

Dashboard KPIs load from Supabase when `.env.local` has a real anon key.
