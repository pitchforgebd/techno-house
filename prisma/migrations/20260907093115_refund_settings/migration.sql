-- CreateTable
CREATE TABLE "RefundSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "refundType" TEXT NOT NULL DEFAULT 'global',
    "globalRefundDays" INTEGER NOT NULL DEFAULT 7,
    "disputeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "disputeDays" INTEGER NOT NULL DEFAULT 3,
    "stickerSrc" TEXT,
    "categoryDaysJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundSettings_pkey" PRIMARY KEY ("id")
);
