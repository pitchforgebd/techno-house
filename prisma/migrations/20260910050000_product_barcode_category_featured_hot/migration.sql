-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHot" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
