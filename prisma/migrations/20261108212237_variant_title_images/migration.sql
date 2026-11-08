-- Per-variant title + image gallery, and an order-line image snapshot (AD-390).
-- Additive only; the backfill copies each existing single variant image into
-- its new gallery so nothing already uploaded disappears.

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "imageSrc" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "imageSrcs" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT;

-- Backfill
UPDATE "ProductVariant"
SET "imageSrcs" = ARRAY["imageSrc"]
WHERE "imageSrc" IS NOT NULL AND "imageSrc" <> '';
