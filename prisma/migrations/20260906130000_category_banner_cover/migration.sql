-- Category banner / cover image paths for admin media picker
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "bannerSrc" TEXT;
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "coverSrc" TEXT;
