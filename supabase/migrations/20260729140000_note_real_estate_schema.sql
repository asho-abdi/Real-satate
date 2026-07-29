-- Local reference migration (already applied remotely as init_real_estate_schema via MCP).
-- Domain tables live in schema real_estate to avoid colliding with existing public travel tables.

-- See docs/supabase-setup.md for:
-- 1) Expose `real_estate` in Dashboard → Settings → API → Exposed schemas
-- 2) Env URL/keys wiring
-- 3) Seed status

create schema if not exists real_estate;
