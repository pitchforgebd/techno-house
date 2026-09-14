-- Product colours + cart/order colour snapshots
CREATE TABLE IF NOT EXISTS "ProductColor" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductColor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductColor_productId_name_key" ON "ProductColor"("productId", "name");
CREATE INDEX IF NOT EXISTS "ProductColor_productId_position_idx" ON "ProductColor"("productId", "position");

ALTER TABLE "ProductColor" DROP CONSTRAINT IF EXISTS "ProductColor_productId_fkey";
ALTER TABLE "ProductColor" ADD CONSTRAINT "ProductColor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "colorId" TEXT;

ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_cartId_productId_variantId_key";
DROP INDEX IF EXISTS "CartItem_cartId_productId_variantId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_cartId_productId_variantId_colorId_key" ON "CartItem"("cartId", "productId", "variantId", "colorId");
CREATE INDEX IF NOT EXISTS "CartItem_colorId_idx" ON "CartItem"("colorId");

ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_colorId_fkey";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "colorName" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "colorHex" TEXT;
