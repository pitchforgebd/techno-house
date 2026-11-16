-- Share-preview image and staff search tags on products (AD-412). Additive only.

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "metaImageSrc" TEXT,
ADD COLUMN     "searchTags" TEXT;
