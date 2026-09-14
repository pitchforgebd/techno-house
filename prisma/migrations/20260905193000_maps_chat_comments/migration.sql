-- CreateEnum
CREATE TYPE "ChatWidgetProvider" AS ENUM ('WHATSAPP', 'MESSENGER');

-- CreateTable
CREATE TABLE "GoogleMapConfiguration" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleMapConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatWidgetConfiguration" (
    "id" TEXT NOT NULL,
    "provider" "ChatWidgetProvider" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicHandle" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatWidgetConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentSystemConfiguration" (
    "id" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT NOT NULL DEFAULT 'facebook',
    "publicAppId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentSystemConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatWidgetConfiguration_provider_key" ON "ChatWidgetConfiguration"("provider");
