-- Brand merchandising position and description (P12-T02).

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "description" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill position from existing catalogue order (createdAt, then slug).
UPDATE "Brand" AS b
SET "position" = s.ord - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, slug ASC) AS ord
  FROM "Brand"
) AS s
WHERE b.id = s.id;
