-- Per-colour product gallery images
CREATE TABLE IF NOT EXISTS "ProductColorImage" (
    "id" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductColorImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProductColorImage_colorId_position_idx" ON "ProductColorImage"("colorId", "position");

ALTER TABLE "ProductColorImage" DROP CONSTRAINT IF EXISTS "ProductColorImage_colorId_fkey";
ALTER TABLE "ProductColorImage" ADD CONSTRAINT "ProductColorImage_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "ProductColor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
