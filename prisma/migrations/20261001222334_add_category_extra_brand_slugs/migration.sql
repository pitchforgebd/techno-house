-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "extraBrandSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[];
