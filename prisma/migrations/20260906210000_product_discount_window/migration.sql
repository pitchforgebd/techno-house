-- Product discount schedule (optional offer window)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "discountStartsAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "discountEndsAt" TIMESTAMP(3);
