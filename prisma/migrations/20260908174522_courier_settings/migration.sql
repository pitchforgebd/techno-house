-- CreateTable
CREATE TABLE "CourierSetting" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "publicConfigJson" TEXT NOT NULL DEFAULT '{}',
    "secretsCiphertext" TEXT,
    "secretsUpdatedAt" TIMESTAMP(3),
    "updatedByStaffId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourierSetting_provider_key" ON "CourierSetting"("provider");

-- CreateIndex
CREATE INDEX "CourierSetting_enabled_idx" ON "CourierSetting"("enabled");
