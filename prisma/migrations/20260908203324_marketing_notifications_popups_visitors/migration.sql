-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateTable
CREATE TABLE "NotificationTypeSetting" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultText" TEXT NOT NULL,
    "audience" "NotificationAudience" NOT NULL DEFAULT 'CUSTOMER',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTypeSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "fromName" TEXT NOT NULL DEFAULT 'Techno House',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "imagePath" TEXT,
    "buttonText" TEXT,
    "buttonColor" TEXT NOT NULL DEFAULT '#eab308',
    "buttonTextTone" TEXT NOT NULL DEFAULT 'dark',
    "link" TEXT,
    "delaySeconds" INTEGER NOT NULL DEFAULT 3,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductViewEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductViewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorWidgetSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "windowMinutes" INTEGER NOT NULL DEFAULT 15,
    "minToShow" INTEGER NOT NULL DEFAULT 2,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorWidgetSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductViewEvent_productId_viewedAt_idx" ON "ProductViewEvent"("productId", "viewedAt");

-- AddForeignKey
ALTER TABLE "ProductViewEvent" ADD CONSTRAINT "ProductViewEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
