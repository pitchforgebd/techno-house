-- CreateTable
CREATE TABLE "CustomScriptSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "headerScript" TEXT,
    "footerScript" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomScriptSettings_pkey" PRIMARY KEY ("id")
);
