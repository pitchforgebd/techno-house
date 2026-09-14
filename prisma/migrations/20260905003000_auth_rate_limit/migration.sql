-- Auth attempt counters (P11-T06). bucketKey is a hashed IP or email, never raw.

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "bucketKey" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("bucketKey")
);

-- CreateIndex
CREATE INDEX "AuthRateLimit_windowStart_idx" ON "AuthRateLimit"("windowStart");
