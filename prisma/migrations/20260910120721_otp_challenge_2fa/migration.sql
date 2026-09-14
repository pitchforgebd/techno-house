-- CreateEnum
CREATE TYPE "OtpChallengePurpose" AS ENUM ('LOGIN', 'REGISTRATION');

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "OtpChallengePurpose" NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "pendingFullName" TEXT,
    "pendingEmail" TEXT,
    "pendingPhone" TEXT,
    "pendingPasswordHash" TEXT,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OtpChallenge_tokenHash_key" ON "OtpChallenge"("tokenHash");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_idx" ON "OtpChallenge"("phone");

-- CreateIndex
CREATE INDEX "OtpChallenge_expiresAt_idx" ON "OtpChallenge"("expiresAt");
