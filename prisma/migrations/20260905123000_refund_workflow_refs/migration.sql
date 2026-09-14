-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "sessionRef" TEXT;

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN "payoutRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Refund_payoutRef_key" ON "Refund"("payoutRef");
