-- Stored product SEO text (SEO phase 8). Additive and nullable: every existing
-- row keeps NULL, and the storefront keeps using the built-in title/description
-- template for a product until one of these is set. No backfill.
--
-- Rollback: ALTER TABLE "Product" DROP COLUMN "metaTitle", DROP COLUMN
-- "metaDescription", DROP COLUMN "seoKeyword", DROP COLUMN "seoSource",
-- DROP COLUMN "seoGeneratedAt";  (and delete this migration's row from
-- "_prisma_migrations" if the migration has to be re-run).

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "seoKeyword" TEXT,
ADD COLUMN     "seoSource" TEXT,
ADD COLUMN     "seoGeneratedAt" TIMESTAMP(3);

-- Who wrote the stored text: the apply script ('generated') or staff ('admin').
ALTER TABLE "Product" ADD CONSTRAINT "Product_seoSource_check"
  CHECK ("seoSource" IS NULL OR "seoSource" IN ('generated', 'admin'));
