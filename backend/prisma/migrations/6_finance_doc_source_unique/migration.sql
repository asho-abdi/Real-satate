-- Idempotent finance documents: unique (type, sourceType, sourceId) when source is set.
-- Keeps historical docs that have no source linkage.

-- Collapse accidental duplicates: keep earliest createdAt per (type, sourceType, sourceId)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "type", "sourceType", "sourceId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "FinanceDocument"
  WHERE "sourceType" IS NOT NULL AND "sourceId" IS NOT NULL
)
DELETE FROM "FinanceDocument"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS "FinanceDocument_type_sourceType_sourceId_key"
ON "FinanceDocument" ("type", "sourceType", "sourceId")
WHERE "sourceType" IS NOT NULL AND "sourceId" IS NOT NULL;
