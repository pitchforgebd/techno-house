-- Per-product specification presentation (P10-T06).
--
-- `ProductAttribute.groupLabel` could not hold the specification table's
-- grouping: the group belongs to the product, not the attribute (`storage`
-- appears under "Core" on a laptop and "Phone" on a handset). Card chips are
-- likewise not derivable from attributes, because the shopper-facing wording
-- differs ("512GB SSD" vs the comparable "512GB") and some products have chips
-- with no attribute at all.
--
-- Both dropped columns only ever held seed-derived data; the seed rewrites the
-- equivalent content into the new tables.

-- AlterTable
ALTER TABLE "ProductAttribute" DROP COLUMN "groupLabel";

-- AlterTable
ALTER TABLE "ProductAttributeValue" DROP COLUMN "isHighlight";

-- CreateTable
CREATE TABLE "ProductSpecChip" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpecChip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpecGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpecGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSpecRow" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpecRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSpecChip_productId_position_idx" ON "ProductSpecChip"("productId", "position");

-- CreateIndex
CREATE INDEX "ProductSpecGroup_productId_position_idx" ON "ProductSpecGroup"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSpecGroup_productId_title_key" ON "ProductSpecGroup"("productId", "title");

-- CreateIndex
CREATE INDEX "ProductSpecRow_groupId_position_idx" ON "ProductSpecRow"("groupId", "position");

-- AddForeignKey
ALTER TABLE "ProductSpecChip" ADD CONSTRAINT "ProductSpecChip_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpecGroup" ADD CONSTRAINT "ProductSpecGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSpecRow" ADD CONSTRAINT "ProductSpecRow_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ProductSpecGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
