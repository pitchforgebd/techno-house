-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "linkLabel" TEXT,
    "link" TEXT,
    "imagePath" TEXT,
    "size" TEXT NOT NULL DEFAULT 'small',
    "backgroundColor" TEXT NOT NULL DEFAULT '#000000',
    "textTone" TEXT NOT NULL DEFAULT 'light',
    "location" TEXT NOT NULL DEFAULT 'bottom-left',
    "autoCloseSeconds" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);
