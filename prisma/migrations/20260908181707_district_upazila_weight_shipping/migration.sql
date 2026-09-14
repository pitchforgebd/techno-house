-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "weightGrams" INTEGER NOT NULL DEFAULT 500;

-- AlterTable
ALTER TABLE "ShippingZone" ADD COLUMN     "baseRateAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "baseWeightGrams" INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN     "extraRatePerKgAmount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upazila" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shippingAreaId" TEXT,

    CONSTRAINT "Upazila_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");

-- CreateIndex
CREATE INDEX "District_zoneId_idx" ON "District"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Upazila_shippingAreaId_key" ON "Upazila"("shippingAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Upazila_districtId_name_key" ON "Upazila"("districtId", "name");

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upazila" ADD CONSTRAINT "Upazila_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upazila" ADD CONSTRAINT "Upazila_shippingAreaId_fkey" FOREIGN KEY ("shippingAreaId") REFERENCES "ShippingArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
