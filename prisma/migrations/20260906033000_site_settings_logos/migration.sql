-- Storefront branding assets on SiteSettings
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "logoSrc" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "logoOnDarkSrc" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "faviconSrc" TEXT;
