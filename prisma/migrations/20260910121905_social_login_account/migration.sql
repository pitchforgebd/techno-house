-- CreateTable
CREATE TABLE "SocialLoginAccount" (
    "id" TEXT NOT NULL,
    "provider" "SocialLoginProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialLoginAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialLoginAccount_userId_idx" ON "SocialLoginAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialLoginAccount_provider_providerAccountId_key" ON "SocialLoginAccount"("provider", "providerAccountId");

-- AddForeignKey
ALTER TABLE "SocialLoginAccount" ADD CONSTRAINT "SocialLoginAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
