-- Suggested attribute values for admin (P12-T03). Facets still use product values.

-- AlterTable
ALTER TABLE "ProductAttribute" ADD COLUMN     "allowedValues" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill from values already assigned to products.
UPDATE "ProductAttribute" AS a
SET "allowedValues" = COALESCE((
  SELECT ARRAY_AGG(DISTINCT v.value ORDER BY v.value)
  FROM "ProductAttributeValue" v
  WHERE v."attributeId" = a.id
), ARRAY[]::TEXT[]);
