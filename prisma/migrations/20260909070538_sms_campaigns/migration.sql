-- CreateEnum
CREATE TYPE "SmsCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "SmsCampaign" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "status" "SmsCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsCampaign_pkey" PRIMARY KEY ("id")
);
