-- Flat per-order service charge, snapshotted at placement.
--
-- Purely additive: one new column with a default of 0, so every existing order
-- reads back exactly as it did before and no row is rewritten. Postgres stores
-- a constant default in the catalogue rather than touching the heap, so this
-- does not take a long lock on "Order".
ALTER TABLE "Order" ADD COLUMN "serviceChargeAmount" INTEGER NOT NULL DEFAULT 0;

-- A charge, never a credit. Mirrors the guard already on ProductStock.reserved:
-- the application clamps, and the database refuses to store the impossible.
ALTER TABLE "Order"
  ADD CONSTRAINT "Order_service_charge_non_negative"
  CHECK ("serviceChargeAmount" >= 0);
