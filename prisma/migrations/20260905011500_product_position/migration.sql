-- Product merchandising position (P12-T04).

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_isActive_position_idx" ON "Product"("isActive", "position");

-- Backfill position from existing catalogue order (createdAt, then slug).
UPDATE "Product" AS p
SET "position" = s.ord - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, slug ASC) AS ord
  FROM "Product"
) AS s
WHERE p.id = s.id;
