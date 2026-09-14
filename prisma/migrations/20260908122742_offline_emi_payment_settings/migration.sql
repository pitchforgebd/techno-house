-- CreateTable
CREATE TABLE "OfflinePaymentSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "codEnabled" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT NOT NULL DEFAULT 'Cash on delivery',
    "instructions" TEXT NOT NULL DEFAULT 'Pay in cash when the order arrives.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflinePaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmiSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "tenureMonthsJson" TEXT NOT NULL DEFAULT '[3,6,12]',
    "partnerName" TEXT,
    "interestNote" TEXT,
    "minOrderAmount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmiSettings_pkey" PRIMARY KEY ("id")
);
