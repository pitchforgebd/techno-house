-- CreateTable
CREATE TABLE "SmtpConfiguration" (
    "id" TEXT NOT NULL,
    "mailerType" TEXT NOT NULL DEFAULT 'smtp',
    "host" TEXT,
    "port" INTEGER NOT NULL DEFAULT 587,
    "username" TEXT,
    "encryption" TEXT NOT NULL DEFAULT 'tls',
    "fromAddress" TEXT,
    "fromName" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmtpConfiguration_pkey" PRIMARY KEY ("id")
);
