-- CreateTable
CREATE TABLE "LanguageSetting" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "rtl" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageSetting_pkey" PRIMARY KEY ("code")
);
