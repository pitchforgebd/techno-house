-- Variant options, per-variant image/order, and an order-line variant snapshot (AD-388). Additive only.

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "variantName" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "variantOptionNames" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "imageSrc" TEXT,
ADD COLUMN     "optionValues" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;
