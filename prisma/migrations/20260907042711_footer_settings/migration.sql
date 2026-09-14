-- AlterTable
ALTER TABLE "CommentSystemConfiguration" ALTER COLUMN "id" SET DEFAULT 'singleton';

-- AlterTable
ALTER TABLE "FirebaseConfiguration" ALTER COLUMN "id" SET DEFAULT 'singleton';

-- AlterTable
ALTER TABLE "GoogleMapConfiguration" ALTER COLUMN "id" SET DEFAULT 'singleton';

-- AlterTable
ALTER TABLE "OtpSmsConfiguration" ALTER COLUMN "id" SET DEFAULT 'singleton';

-- AlterTable
ALTER TABLE "RecaptchaConfiguration" ALTER COLUMN "id" SET DEFAULT 'singleton';

-- AlterTable
ALTER TABLE "SmtpConfiguration" ALTER COLUMN "id" SET DEFAULT 'singleton';

-- CreateTable
CREATE TABLE "FooterSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterSettings_pkey" PRIMARY KEY ("id")
);
