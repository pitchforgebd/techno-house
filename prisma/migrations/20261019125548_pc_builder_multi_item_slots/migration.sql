-- Allow a PC build to hold more than one distinct product in the same
-- multi-item slot (RAM, SSD, HDD) by widening the uniqueness guard from
-- (build, slot) to (build, slot, product). Identical repeats of the same
-- product within a slot still collapse into one row via `quantity`.

-- DropIndex
DROP INDEX "PCBuildItem_buildId_slot_key";

-- CreateIndex
CREATE UNIQUE INDEX "PCBuildItem_buildId_slot_productId_key" ON "PCBuildItem"("buildId", "slot", "productId");
