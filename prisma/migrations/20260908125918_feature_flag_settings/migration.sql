-- CreateTable
CREATE TABLE "FeatureFlagSetting" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlagSetting_pkey" PRIMARY KEY ("id")
);
