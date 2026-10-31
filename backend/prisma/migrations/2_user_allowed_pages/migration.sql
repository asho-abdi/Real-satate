-- Per-user page access (staff). Admin ignores this field.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "allowedPages" JSONB;
