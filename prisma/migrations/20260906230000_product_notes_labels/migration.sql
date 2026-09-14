-- Product-attached note and label preset ids (Admin → Notes / Labels)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "noteIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "labelIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
