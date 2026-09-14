-- CreateTable
CREATE TABLE "StoreOperationsSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "orderCodePrefix" TEXT NOT NULL DEFAULT 'TH-',
    "minimumOrderAmount" INTEGER NOT NULL DEFAULT 0,
    "autoConfirmPaidOrders" BOOLEAN NOT NULL DEFAULT false,
    "vatRateBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "serviceChargeAmount" INTEGER NOT NULL DEFAULT 0,
    "taxIncludedInPrice" BOOLEAN NOT NULL DEFAULT true,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultPickupPoint" TEXT NOT NULL DEFAULT 'dhaka-showroom',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "invoiceFooter" TEXT NOT NULL DEFAULT '',
    "trackingUrlTemplate" TEXT NOT NULL DEFAULT '',
    "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "labelSize" TEXT NOT NULL DEFAULT '4x6',
    "labelShowLogo" BOOLEAN NOT NULL DEFAULT true,
    "thermalPrinterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "thermalPaperWidthMm" INTEGER NOT NULL DEFAULT 80,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreOperationsSettings_pkey" PRIMARY KEY ("id")
);
