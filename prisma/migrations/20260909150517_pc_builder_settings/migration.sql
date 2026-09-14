-- CreateTable
CREATE TABLE "PcBuilderSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PcBuilderSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PcBuilderSlotConfig" (
    "slot" "BuilderSlot" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PcBuilderSlotConfig_pkey" PRIMARY KEY ("slot")
);
