-- One logo, not two.
--
-- The storefront has no light mode: header and footer are both dark chrome,
-- so `logoOnDarkSrc` was the only slot ever rendered and `logoSrc` sat empty.
-- Asking an admin to maintain two files for one surface is a question with no
-- right answer.
--
-- The surviving column is `logoSrc`, and the value is copied across BEFORE the
-- drop — the live logo is currently stored in `logoOnDarkSrc`, so dropping
-- first would delete it. COALESCE keeps an explicitly-set `logoSrc` if one
-- exists rather than overwriting it.
UPDATE "SiteSettings"
SET "logoSrc" = COALESCE("logoSrc", "logoOnDarkSrc")
WHERE "logoOnDarkSrc" IS NOT NULL;

ALTER TABLE "SiteSettings" DROP COLUMN "logoOnDarkSrc";
