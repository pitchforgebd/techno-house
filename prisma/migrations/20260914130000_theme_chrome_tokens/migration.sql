-- Admin-controllable header and footer colours.
--
-- Four nullable columns on the existing singleton theme row. Each drives a CSS
-- variable added in the same change to app/globals.css, defaulting to the exact
-- pairing the chrome already rendered as (#051c39 on white), so a NULL row --
-- which is every existing row -- reproduces today's appearance exactly.
--
-- Why these are separate from themeTextColor: the header, top bar, category nav
-- and footer all sat on `--color-text`, so the body ink and the dark panel
-- ground were one variable. Once that variable became admin-editable, changing
-- "body text" would have silently recoloured the whole chrome too.
--
-- NON-DESTRUCTIVE. Nullable columns with no default: nothing is rewritten,
-- nothing is validated against existing rows, no data is modified.
ALTER TABLE "DesignThemeSettings"
  ADD COLUMN "themeHeaderBgColor"   TEXT,
  ADD COLUMN "themeHeaderTextColor" TEXT,
  ADD COLUMN "themeFooterBgColor"   TEXT,
  ADD COLUMN "themeFooterTextColor" TEXT;
