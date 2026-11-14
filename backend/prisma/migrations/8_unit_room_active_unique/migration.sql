-- Soft-deleted units must not block recreating the same room number in a building.
DROP INDEX IF EXISTS "Unit_buildingId_roomNumber_key";

CREATE UNIQUE INDEX "Unit_buildingId_roomNumber_active_key"
  ON "Unit" ("buildingId", "roomNumber")
  WHERE "deletedAt" IS NULL;
