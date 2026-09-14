-- Customer sessions (P11-T01).
-- Opaque tokens only: the cookie holds a random secret; the database stores
-- SHA-256(token). Staff sessions remain a separate concern in P11-T02.

-- CreateTable
CREATE TABLE "CustomerSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerSession_tokenHash_key" ON "CustomerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerSession_userId_idx" ON "CustomerSession"("userId");

-- CreateIndex
CREATE INDEX "CustomerSession_expiresAt_idx" ON "CustomerSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "CustomerSession" ADD CONSTRAINT "CustomerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
