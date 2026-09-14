-- CreateEnum
CREATE TYPE "OrderStockState" AS ENUM ('RESERVED', 'RELEASED', 'CONVERTED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "stockState" "OrderStockState" NOT NULL DEFAULT 'RESERVED';

-- Structural guarantee for DSA-01 / DSA-02.
--
-- `reserved` is written from application code in several places. A lost update
-- or a double release would previously corrupt it silently; with this in place
-- the transaction aborts instead. Verified safe before adding: a read-only
-- survey of all 25 ProductStock rows found 0 rows violating either half.
ALTER TABLE "ProductStock"
  ADD CONSTRAINT "ProductStock_reserved_within_quantity"
  CHECK ("reserved" >= 0 AND "reserved" <= "quantity");
