-- CreateEnum
CREATE TYPE "EmailTemplateAudience" AS ENUM ('ALL', 'ADMIN', 'CUSTOMER', 'COMMON');

-- CreateEnum
CREATE TYPE "NewsletterCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "EmailTemplateAudience" NOT NULL DEFAULT 'CUSTOMER',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NewsletterCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");
