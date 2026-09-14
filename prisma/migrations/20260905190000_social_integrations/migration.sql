-- CreateEnum
CREATE TYPE "SocialLoginProvider" AS ENUM ('GOOGLE', 'FACEBOOK', 'TWITTER', 'APPLE');

-- CreateTable
CREATE TABLE "SocialLoginConfiguration" (
    "id" TEXT NOT NULL,
    "provider" "SocialLoginProvider" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicClientId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialLoginConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecaptchaConfiguration" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "siteKey" TEXT,
    "scoreThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "pageAdminLogin" BOOLEAN NOT NULL DEFAULT false,
    "pageCustomerLogin" BOOLEAN NOT NULL DEFAULT false,
    "pageCustomerRegistration" BOOLEAN NOT NULL DEFAULT false,
    "pageForgotPassword" BOOLEAN NOT NULL DEFAULT false,
    "pageContactUs" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecaptchaConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirebaseConfiguration" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirebaseConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialLoginConfiguration_provider_key" ON "SocialLoginConfiguration"("provider");
