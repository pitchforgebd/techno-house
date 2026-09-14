-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "buildBatchId" TEXT,
ADD COLUMN     "builderSlot" "BuilderSlot";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "buildBatchId" TEXT,
ADD COLUMN     "builderSlot" "BuilderSlot";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "builderStorageInterface" TEXT;
