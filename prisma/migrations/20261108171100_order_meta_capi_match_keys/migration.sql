-- Meta Conversions API match keys on Order (AD-389). Additive, nullable only.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "clientIp" TEXT,
ADD COLUMN     "clientUserAgent" TEXT,
ADD COLUMN     "fbc" TEXT,
ADD COLUMN     "fbp" TEXT;
