-- AlterTable
ALTER TABLE "B2BAccount" ADD COLUMN     "nidNumber" TEXT;

-- CreateTable
CREATE TABLE "B2BProductPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceAmount" INTEGER NOT NULL,
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2BProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "B2BProductPrice_productId_key" ON "B2BProductPrice"("productId");

-- CreateIndex
CREATE INDEX "B2BProductPrice_isActive_idx" ON "B2BProductPrice"("isActive");

-- AddForeignKey
ALTER TABLE "B2BProductPrice" ADD CONSTRAINT "B2BProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
