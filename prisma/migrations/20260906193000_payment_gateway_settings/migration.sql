-- CreateTable
CREATE TABLE "PaymentGatewaySetting" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sandbox" BOOLEAN NOT NULL DEFAULT true,
    "publicConfigJson" TEXT NOT NULL DEFAULT '{}',
    "secretsCiphertext" TEXT,
    "secretsUpdatedAt" TIMESTAMP(3),
    "updatedByStaffId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentGatewaySetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewaySetting_provider_key" ON "PaymentGatewaySetting"("provider");

-- CreateIndex
CREATE INDEX "PaymentGatewaySetting_enabled_idx" ON "PaymentGatewaySetting"("enabled");
