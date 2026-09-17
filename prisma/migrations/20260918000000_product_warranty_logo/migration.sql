-- Uploaded warranty logo (Admin -> Warranty -> Edit).
--
-- One nullable column, no default. NULL means "no uploaded logo" — the
-- existing auto-generated text badge (warrantyBadgeFromLabel) keeps showing
-- exactly as it does today, for every existing row.
--
-- NON-DESTRUCTIVE. Nothing is rewritten, nothing is validated against
-- existing rows, no data is modified.
ALTER TABLE "ProductWarranty" ADD COLUMN "logoSrc" TEXT;
