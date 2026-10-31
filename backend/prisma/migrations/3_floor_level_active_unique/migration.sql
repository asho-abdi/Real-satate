-- Soft-deleted floors must not block recreating the same level.
DROP INDEX IF EXISTS "Floor_buildingId_level_key";

CREATE UNIQUE INDEX "Floor_buildingId_level_active_key"
  ON "Floor" ("buildingId", "level")
  WHERE "deletedAt" IS NULL;
