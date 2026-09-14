-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "currencyDecimalPlaces" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currencySymbolPosition" TEXT NOT NULL DEFAULT 'before';
