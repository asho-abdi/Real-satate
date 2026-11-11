-- Commercial Spaces subtype (Shop | Office), backfilled from Unit.usage.
-- Existing SHOP/OFFICE rows keep all historical data; commercialType mirrors usage.

DO $$ BEGIN
  CREATE TYPE "CommercialType" AS ENUM ('SHOP', 'OFFICE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "commercialType" "CommercialType";

UPDATE "Unit"
SET "commercialType" = 'SHOP'
WHERE "usage" = 'SHOP' AND ("commercialType" IS NULL OR "commercialType" IS DISTINCT FROM 'SHOP');

UPDATE "Unit"
SET "commercialType" = 'OFFICE'
WHERE "usage" = 'OFFICE' AND ("commercialType" IS NULL OR "commercialType" IS DISTINCT FROM 'OFFICE');

UPDATE "Unit"
SET "commercialType" = NULL
WHERE "usage" NOT IN ('SHOP', 'OFFICE') AND "commercialType" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Unit_commercialType_idx" ON "Unit"("commercialType");

-- Payment defaults: office agent account (Mpesa number already seeded)
INSERT INTO "Setting" ("id", "key", "value", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'payments.agentAccountName', '"Office Agent"'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE "key" = 'payments.agentAccountName');

INSERT INTO "Setting" ("id", "key", "value", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'payments.agentAccountReference', '""'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Setting" WHERE "key" = 'payments.agentAccountReference');
