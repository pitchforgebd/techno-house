-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "extraAddressesJson" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "extraEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "extraPhones" TEXT[] DEFAULT ARRAY[]::TEXT[];
