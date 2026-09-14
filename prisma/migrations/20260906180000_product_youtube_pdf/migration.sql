-- Product page media: YouTube link + PDF specification sheet.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "youtubeUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "pdfSpecificationSrc" TEXT;
