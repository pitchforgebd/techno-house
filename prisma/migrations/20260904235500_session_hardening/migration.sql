-- Session hardening (P11-T03).
-- lastUsedAt is touched on resolve (throttled) so idle activity is visible
-- without rewriting the row on every request.

-- AlterTable
ALTER TABLE "CustomerSession" ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "StaffSession" ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "CustomerSession" SET "lastUsedAt" = "createdAt";
UPDATE "StaffSession" SET "lastUsedAt" = "createdAt";
