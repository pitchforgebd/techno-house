-- Admin-controllable storefront colours, part 2.
--
-- Six nullable columns on the existing singleton theme row. Each drives a CSS
-- variable that ALREADY exists in app/globals.css and is already consumed by
-- Tailwind utilities across the storefront, so no component changes with this
-- migration and none needs to.
--
-- NULL means "use the built-in default". The runtime emitter omits the
-- override for a null or invalid value, so the token keeps the value compiled
-- into globals.css. That is why this migration is invisible: every existing
-- row gets NULL, and NULL reproduces today's rendering exactly.
--
-- NON-DESTRUCTIVE. Adding a nullable column with no default rewrites nothing
-- and cannot fail validation against existing rows. No data is modified.
ALTER TABLE "DesignThemeSettings"
  ADD COLUMN "themeTextColor"       TEXT,
  ADD COLUMN "themeBackgroundColor" TEXT,
  ADD COLUMN "themeSurfaceColor"    TEXT,
  ADD COLUMN "themeBorderColor"     TEXT,
  ADD COLUMN "themeBrightColor"     TEXT,
  ADD COLUMN "themeOnPrimaryColor"  TEXT;
