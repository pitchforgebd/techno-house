-- CreateTable
CREATE TABLE "DesignThemeSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "themeBaseColor" TEXT,
    "themeAccentColor" TEXT,
    "themeHoverColor" TEXT,
    "themeSoftColor" TEXT,
    "watermarkEnabled" BOOLEAN NOT NULL DEFAULT false,
    "watermarkType" TEXT NOT NULL DEFAULT 'image',
    "watermarkImageSrc" TEXT,
    "watermarkPosition" TEXT,
    "bodyFont" TEXT,
    "headingFont" TEXT,
    "authBgColor" TEXT,
    "authPanelColor" TEXT,
    "authIllustrationSrc" TEXT,
    "adminNavBgColor" TEXT,
    "adminNavTextColor" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignThemeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeBanner" (
    "id" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT,
    "cta" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "imageSrc" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomeBanner_slot_isActive_position_idx" ON "HomeBanner"("slot", "isActive", "position");
