-- CreateEnum
CREATE TYPE "HomeSection" AS ENUM ('FEATURED', 'DEALS');

-- CreateTable
CREATE TABLE "HomeSectionProduct" (
    "id" TEXT NOT NULL,
    "section" "HomeSection" NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeSectionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeSectionProduct_section_position_idx" ON "HomeSectionProduct"("section", "position");

-- CreateIndex
CREATE UNIQUE INDEX "HomeSectionProduct_section_productId_key" ON "HomeSectionProduct"("section", "productId");

-- AddForeignKey
ALTER TABLE "HomeSectionProduct" ADD CONSTRAINT "HomeSectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
