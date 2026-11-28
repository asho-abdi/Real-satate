-- Building-specific portfolio features (apartments / guest bookings / commercial).
ALTER TABLE "Building"
  ADD COLUMN IF NOT EXISTS "propertyTypes" TEXT[] NOT NULL DEFAULT ARRAY['APARTMENTS','GUEST_BOOKINGS','COMMERCIAL']::TEXT[];

-- SIHAM / SIHAAM: apartments + commercial only (no guest house).
UPDATE "Building"
SET "propertyTypes" = ARRAY['APARTMENTS','COMMERCIAL']::TEXT[]
WHERE "deletedAt" IS NULL
  AND (
    LOWER(COALESCE("name", '')) LIKE '%siham%'
    OR LOWER(COALESCE("name", '')) LIKE '%sihaam%'
    OR LOWER(COALESCE("code", '')) LIKE '%siham%'
    OR LOWER(COALESCE("code", '')) LIKE '%sihaam%'
  );
