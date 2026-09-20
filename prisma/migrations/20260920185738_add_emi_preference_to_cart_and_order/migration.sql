-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "wantsEmi" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "wantsEmi" BOOLEAN NOT NULL DEFAULT false;
