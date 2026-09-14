-- CreateTable
CREATE TABLE "FilesystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "localActive" BOOLEAN NOT NULL DEFAULT true,
    "s3Active" BOOLEAN NOT NULL DEFAULT false,
    "s3Key" TEXT,
    "s3Region" TEXT,
    "s3Bucket" TEXT,
    "s3SecretCiphertext" TEXT,
    "backblazeActive" BOOLEAN NOT NULL DEFAULT false,
    "backblazeKeyId" TEXT,
    "backblazeBucket" TEXT,
    "backblazeRegion" TEXT,
    "backblazeKeyCiphertext" TEXT,
    "cacheDriver" TEXT NOT NULL DEFAULT 'file',
    "sessionDriver" TEXT NOT NULL DEFAULT 'file',
    "redisHost" TEXT,
    "redisPort" INTEGER,
    "redisPasswordCiphertext" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilesystemSettings_pkey" PRIMARY KEY ("id")
);
