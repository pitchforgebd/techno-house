-- CreateTable
CREATE TABLE "SaleAlertSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "minIntervalSeconds" INTEGER NOT NULL DEFAULT 15,
    "maxIntervalSeconds" INTEGER NOT NULL DEFAULT 45,
    "productScope" TEXT NOT NULL DEFAULT 'featured',
    "manualProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleAlertSettings_pkey" PRIMARY KEY ("id")
);
