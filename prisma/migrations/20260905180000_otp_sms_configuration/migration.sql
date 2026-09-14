-- CreateTable
CREATE TABLE "OtpSmsConfiguration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'local-mock',
    "senderId" TEXT,
    "otpLength" INTEGER NOT NULL DEFAULT 6,
    "expiryMinutes" INTEGER NOT NULL DEFAULT 5,
    "otpLogin" BOOLEAN NOT NULL DEFAULT false,
    "otpRegistration" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OtpSmsConfiguration_pkey" PRIMARY KEY ("id")
);
