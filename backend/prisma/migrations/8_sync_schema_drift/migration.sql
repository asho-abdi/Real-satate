-- Bring the migration history in line with schema.prisma (non-destructive).
-- Prisma sets updatedAt itself, so the database default is not needed.
ALTER TABLE "FinanceDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "SecurityDeposit" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Speeds up floor lookups by building + level.
CREATE INDEX IF NOT EXISTS "Floor_buildingId_level_idx" ON "Floor"("buildingId", "level");
