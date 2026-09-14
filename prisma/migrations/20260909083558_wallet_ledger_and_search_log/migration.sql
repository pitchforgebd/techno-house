-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchLog" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_idx" ON "WalletTransaction"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "SearchLog_query_idx" ON "SearchLog"("query");

-- CreateIndex
CREATE INDEX "SearchLog_createdAt_idx" ON "SearchLog"("createdAt");

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
