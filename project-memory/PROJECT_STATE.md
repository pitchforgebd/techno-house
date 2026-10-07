# Techno House — Current Project State

## Current Phase
PHASES 01–17 — Manual testing (operator-led). Phase 18 paused.

## Current Task
Security remediation, operator-driven and phased. AD-318 (Phase 1,
inventory), AD-319 (Phase 2, refunds) AD-320 (Phase 3, privilege
containment) AD-321 (Phase 4, wallet + build green) AD-322 (Phase 5, public
tracking) AD-323 (Phase 6, CSRF/route security) AD-324 (Phase 7,
hardening) AD-325 (Phase 15, security headers) AD-326 (OAuth identity
linking) AD-327 (trustworthy client IP) AD-328 (staff lockout +
password policy) AD-329 (secret key derivation) AD-330 (F-03, P0-04, lint and
baseline cleanup) AD-331 (Phase 17 admin verification) AD-332 (remaining
low-severity findings) AD-333 (VAT wiring), AD-334 (per-customer coupon cap) and AD-335 (the
four deferred decisions) and AD-336 (final verification) are complete.
The remediation brief is finished; see `REMEDIATION_VERIFICATION.md`. Phases 3+ of
`DEEP_SECURITY_LOOPHOLE_AUDIT.md` are not started — each needs explicit
approval before it begins. No code was changed by it;
its 17 findings are an open backlog, not applied fixes. The
full detail for AD-276..AD-315 lives in `project-memory/TASKS.md`; this
file's narrative sections below stop at AD-288 and are historical.

## Status
Core sales + account paths are DB-backed. Catalogue repositories no longer
switch to in-memory mocks at runtime. Admin customers, orders, refunds,
support tickets/contacts, staff list, dashboard KPIs, customer account
orders/tickets/notifications, and the **media library** read/write PostgreSQL.

Cart is items + price details only. Checkout is a single two-column page.
SSLCommerz / bKash credentials are managed in **Admin → Payment Methods**,
encrypted in `PaymentGatewaySetting`, and used for hosted checkout (env
fallback remains). Set `GATEWAY_SECRETS_KEY` before saving secrets.

Staff login is at `/admin/access/{ADMIN_LOGIN_SLUG}` (local default
`th-ops-local`). Legacy `/admin/login` returns 404.

Product attributes, YouTube, PDF sheets, **manual specification sections**,
**product colours** (optional **per-colour gallery images**), **warranty
presets with logo**, **notes + labels** from Admin catalogues, and
**special/regular prices** (plus optional offer dates) set in admin appear
on the storefront product page. Selecting a colour on the PDP swaps the
gallery when that colour has images; otherwise product-level images stay.
The PDP gallery shows only uploaded frames (no pad-to-6) and supports
desktop hover lens + side zoom on the main image.

Some admin chrome still uses seed/demo *type* modules or display-only mocks
(marketing popups/SMS UI, design-studio localStorage, B2B, reports, etc.) —
those are follow-ups, not checkout blockers. **Product requests** from
`/product-request` now persist as `Complaint` (`PRODUCT_REQUEST`) and appear
under Admin → Product requests. Status / staff-note updates on Product
requests and Contacts write to PostgreSQL (no mock toast). The admin bell
lists all staff IN_APP alerts (orders, product requests, tickets/replies,
reviews, questions, refunds, newsletter) — not orders only. Staff can
manually set order payment to Paid or Unpaid (COD / cash on delivery).
Each order invoice (and order detail) shows a unique scannable QR encoding
shop, order, customer, line items, and totals. Invoice header shows the
current SiteSettings logo (same as the website); changing the logo updates
new invoice views. Public **Order Tracking** at `/track` lists orders by
phone and shows a 4-step progress tracker per order. Storefront footer
widgets (about, social, link columns, contact hours, copyright, toggles,
payment image) are DB-backed via Design Studio → Footer widgets. Payment
methods show as a full-width “We accept” band above copyright. **Refund
settings** (type, days, dispute, reasons, sticker) and category refund days
persist in `RefundSettings` / `RefundReason`; customer requests enforce the
configured window; PDP shows the refund sticker when set. Account support
tickets UI no longer pulls Prisma into the client bundle (AD-234).

**SMART catalog import (2026-09-20, not an AD-numbered item — operator-driven
catalog data-ops, run via one-off `scripts/deploy/*.ts`, not through admin
UI):** the "PRODUCTS LIST ALL SMART.xlsx" POS export (4,218 rows) was
converted to 5 `bulk-import-part-*.csv` files (1000/1000/1000/1000/218 rows,
the admin bulk importer's hard cap) and imported via Admin → Products → Bulk
Import. New one-time bootstrap scripts, all idempotent/safe to re-run,
`npm run catalog:*`:
- `catalog:bootstrap-import-brands` (`create-import-brands.ts`) — 83
  import-specific brands, create-only (never touches an existing brand).
- `catalog:bootstrap-filter-keys` (`set-catalog-filter-keys.ts`) — sets
  `Category.filterKeys` on Photocopier, IP Camera, Operating System, Server,
  Headphone (the 5 highest-volume imported categories that had none
  configured). Deliberately not a re-run of `rebuild-catalog-taxonomy.ts`,
  which also reassigns products off old categories and isn't safe to replay
  against a live, populated catalog.
- `catalog:populate-attributes` (`populate-import-attributes.ts`) — regex-
  extracts attribute *values* (RAM/storage/processor/socket/form factor/
  panel/size/audio type) from `Product.name` + `Product.overview` for six
  categories whose SMART names are clean enough to parse reliably: All
  Laptop, RAM (Desktop/Laptop), Motherboard, Casing, Monitor, Headphone.
  1,650 values set on the real catalog; additive only, never overwrites an
  existing value. `buildFacets` (`lib/data/prisma/product-repository.ts`)
  silently drops a configured `filterKey` when zero products carry a value
  for it — this is why filters were missing on category pages even after
  products existed, and why `filterKeys` config alone isn't enough.

**Known, disclosed gap, not yet fixed:** Photocopier, IP Camera, Server, and
Operating System categories contain real category-*classification* mistakes
inherited from the source POS export (toner/drum consumables filed under
Photocopier instead of Toner; AMC service line items and bare RAM/HDD parts
filed under Server; doorbell/accessory items filed under IP Camera;
B2B/CSP licensing line items with no consumer-readable name filed under
Operating System) — regex attribute extraction was deliberately not
attempted there, since the underlying problem is category assignment, not
missing specs. `bulk-import-needs-review.csv` (248 rows) also still needs
manual review/import — never touched by any script.

## Last Completed Task
AD-288 `/complaint` page redesign — operator shared a reference
screenshot (a bilingual EN/বাংলা complaint form: bold red banner
header, tinted form panel, details-first field order, Submit + Clear
form) and said "complain page design".

Rebuilt the page to that design: a single card with a `bg-danger` banner
carrying a bilingual title and both EN/বাংলা intro lines, a
`primary-soft`-tinted form panel, bold bilingual field labels with the
description **between label and input** (as in the reference), and a
Submit + "Clear form" row on a lighter strip beneath. "Clear form" is a
native `type="reset"` button — no JS needed, so it works on this server
component as-is.

**Field order and count follow the reference**, which meant real
decisions, not just styling:
- **Subject field dropped.** The reference has no subject, but Admin →
  Contacts lists complaints *by* subject. Rather than lose that, made
  `subject` optional in `createComplaint()` and derive one from the
  message — first line if the message has one, otherwise the opening
  clipped to 80 chars **on a word boundary** with an ellipsis. An
  explicitly-passed subject still wins, so the function stays reusable.
- **Email kept as its own required field.** The reference merges phone
  and email into one "Your contact" box, but `Complaint.email` is
  **non-nullable** in the schema — honouring that literally would need a
  migration, so email stays required and phone stays optional. Flagged
  to the operator as the one deliberate deviation.
- Built a local `ComplaintField` for the label→description→input order
  instead of reshaping the shared `Field` (whose hint renders *below*
  the control) — every other form on the site depends on that component.

`tsc --noEmit` clean, `eslint` clean. Verified the derived-subject logic
against real Postgres with three real complaints: a long single
paragraph clipped on a word boundary with an ellipsis, a multi-line
message using its first line, and an explicit subject surviving
untouched — plus confirmed all three were findable through the real
`loadAdminContactList()`, then deleted and confirmed zero left. Live:
`/complaint` 200 with the bilingual banner, details-first ordering, no
`name="subject"` input remaining, the reset button, and no server errors.

AD-287 Homepage service bar + Top categories (`home-service-bar.tsx`,
`home-categories.tsx`) — operator: make these two sections prettier,
more modern and eye-catching.

Found a real bug behind why the category cards felt cheap: the card had
`hover:shadow-md` and `motion-safe:hover:-translate-y-0.5` but its
transition was **`transition-colors`** — so the lift and shadow *snapped
instantly* with no animation while only the colours eased. Widened the
transition to cover transform/shadow/border/background, so the hover
actually animates.

Both sections' icon chips were a flat `bg-primary/10` wash — a pale,
lifeless grey-teal (exactly what the screenshot showed). Gave both the
same chip treatment so the two sections read as siblings: a subtle
`bg-gradient-to-br from-primary/15 to-primary/5` for depth, a
`ring-1 ring-primary/10` edge, and on hover a rich gradient fill
(`from-primary to-primary-hover`) with a **primary-tinted glow**
(`shadow-primary/25–30`, not neutral black) and a slight scale. Card
hover now lifts further with `shadow-lg` and a `primary-soft` tint —
using the token fixed in AD-285, which is now a real teal tint instead
of the dead grey it used to be. Titles/labels got `transition-colors`
so their colour change eases with everything else.

Kept a flat `bg-primary/10` background-*colour* underneath the gradient
background-*image* as a deliberate fallback, so a chip can never render
as a transparent hole if a gradient utility fails to compile — the same
belt-and-braces reasoning used for the AD-286 CTA.

`tsc --noEmit` clean, `eslint` clean. Verified in the compiled CSS that
everything actually reaches the browser: the gradient direction, the
`color-mix` gradient stops driven by `--color-primary`, the ring
colours, and both primary glow tints (`#125e6a40` / `#125e6a4d`).
**Tailwind v4 grep note (third time this has bitten):** v4 emits
gradients as `background-image: linear-gradient(var(--tw-gradient-stops))`
plus a separate `--tw-gradient-position: to bottom right in oklab` — so
grepping the compiled CSS for a literal `linear-gradient(to bottom right`
returns 0 and looks like a total failure when the utility is in fact
working. Check `--tw-gradient-position` / `--tw-gradient-from` instead.

AD-286 Header "PC Builder" CTA (`header-builder-link.tsx`) — operator:
make this button beautiful with a nice hover effect, a bit more modern.

Its hover was actively backwards: `hover:bg-secondary/80` **dimmed** the
copper on hover, so the CTA got quieter exactly when it should get
louder. Replaced with a sweeping sheen (a white highlight band that
travels across the button over ~620ms), a shadow tinted with the
button's own copper instead of neutral black
(`shadow-secondary/30 → hover:shadow-secondary/45`), and a
`motion-safe` lift. Also fixed a real bug: the active-route state used
`ring-offset-surface`, which assumes a **white** backdrop — but this
button sits on the dark navy header, so the offset drew a pale gap
around it. Now an inset white ring, which reads correctly on both the
dark header and the light mobile-nav sheet (the two places this
component is used).

**Two Tailwind-v4 gotchas worth remembering, both caught by verifying
the compiled CSS rather than trusting the build:**
1. `bg-[linear-gradient(…)]`, `bg-[length:…]` and `bg-[position:…]` were
   **silently dropped** — v4 removed that data-type-hint arbitrary
   syntax. Nothing errored; the classes were simply absent from the
   stylesheet while still sitting in the HTML. Rewrote the sheen as a
   real `.th-cta-sheen` class in `globals.css`, matching the `.th-*`
   convention this project already uses (`.th-fade-up`, `.th-skeleton`).
2. `cn()` is a **plain join with no tailwind-merge**, so the shared
   button variant's `hover:bg-secondary/90` could not be overridden from
   the class list — appending `hover:bg-secondary` would just leave both
   in the attribute with the winner decided by Tailwind's emit order.
   Pinned `background-color` inside `.th-cta-sheen` instead: unlayered
   CSS beats Tailwind's layered utilities, so the copper now stays at
   full strength on hover deterministically.

`tsc --noEmit` clean, `eslint` clean. Verified in the **compiled
stylesheet** (not just the build): the `.th-cta-sheen` rule and its
hover sweep, both copper glow tints (`#b8612c4d` / `#b8612c73`), and the
inset-ring utility all emit; `/` and `/pc-builder` both 200 with the
active ring present on the builder route and no server errors. (Note
for future greps: dev CSS is pretty-printed, so line-based
`grep -o "\.class{[^}]*}"` returns a false miss on multi-line rules —
use `grep -A`.)

AD-285 Storefront visual polish — operator (Banglish): keep the design
structure exactly as it is, but improve how it looks; most things are
dynamic now but next to competitors it still doesn't look attractive
enough. Hard constraint: **"structure change kora jabe na"**.

Approach: because structure was off-limits, the work went into the
**design-token layer plus the most-repeated shared components**, so
every page lifts at once without a single element moving. Nothing was
reordered, no markup was added or removed — every change is a token
value or a class on an element that already existed.

**Tokens (`app/globals.css`)** — highest leverage, applies site-wide:
- **Shadows were the main culprit.** Both were single flat washes
  (`--shadow-sm: 0 1px 2px …/0.06`), which is what made cards read as
  pasted-on instead of raised. Replaced with layered shadows (a tight
  contact shadow + a wider ambient one) and added a new `--shadow-lg`
  for hover elevation. Verified in the compiled CSS that all three
  reach the browser — Tailwind v4 emits these through `--tw-shadow`
  rather than literal `.shadow-*` selectors, so a naive grep for
  `.shadow-lg{` looks like a miss; checked the real `--tw-shadow:`
  declarations instead and confirmed all three new values are live.
- **Radii softened**: 6/10/16px → 8/12/20px. 6px corners are what made
  everything read slightly boxy and dated.
- **`--color-primary-soft` was a real defect**: it was `#eef2f5`, byte-
  identical to `--color-surface-muted` — a neutral gray, so every
  "soft primary" surface rendered as dead gray rather than a brand
  tint. Now a genuine tint of the teal (`#e7f0f1`).
- Body gets antialiased font smoothing; headings get `-0.015em`
  tracking (default tracking reads loose and generic at these weights).
- **Deliberately did not touch `--color-primary`/`--color-secondary`**:
  those are brand identity *and* are operator-overridable from Design
  Studio → Appearance (`getStorefrontThemeCss`), so changing the
  defaults would have been both off-brief and liable to be overridden.

**Shared components** (classes only — same props, same markup):
- `Button`: solid variants had no shadow and only `transition-colors`.
  Now carry `shadow-sm → hover:shadow-md` plus an `active:translate-y-px`
  press, so buttons feel physical instead of painted.
- `controlClassName` (every `Input`/`Textarea` on the site): had no
  hover or focus feedback at all. Added `hover:border-text/30` and
  `focus:border-primary`. **Kept the global `:focus-visible` outline
  intact** rather than swapping it for a ring — a nicer-looking ring
  would have quietly weakened the keyboard-accessibility baseline.
- `HomeSectionHeader` (every homepage section): softened the divider,
  added a primary accent bar via `border-l` on the *existing* wrapper
  (no new element), and turned the "See all" link into a proper pill
  hover using the now-real `primary-soft` tint.
- `ProductCard`: swapped its one-off arbitrary hover shadow for the new
  `shadow-lg` token and deepened the hover lift slightly.
- `SiteHeader`: added `shadow-md` so the dark header separates from the
  page instead of butting flat against it.

`tsc --noEmit` clean, `eslint` clean on all touched files. Verified
live: `/`, `/shop`, `/complaint` all 200 with no server errors, and
grepped the rendered HTML plus the compiled Tailwind CSS to confirm
each change actually reaches the browser (the accent bar, the header
shadow, the input hover/focus classes, and all three shadow tokens) —
not just that it compiled.

AD-284 Real "Complaint Box" (`/complaint`) — operator shared a
reference (Ryans Computers' `/complaint` page) and asked for: the
footer's "Report a problem" button relabeled "Complaint Box", linking
to a real complaint page with a real form, landing in the admin panel
for staff to view.

Audited before building: "Report a problem" pointed at `/contact`,
which turned out to be a generic Design-Studio CMS content page with no
real form at all — nothing on the storefront ever actually created a
`Complaint` row with `source: CONTACT_FORM`. But the admin side was
already fully ready for exactly this feature and just never fed: the
`Complaint` model's `ComplaintSource` enum already had a `FOOTER` value,
`lib/admin/load-support.ts` already mapped it to a "footer" label, and
the admin contact detail page already had a `<dd>` rendering
`contact.source` — even the *mock* data already included a "footer"
example row. This was a half-built feature, not new admin surface.

Built the missing half: `lib/support/create-complaint.ts` (new,
mirrors the existing `create-product-request.ts` pattern exactly —
same validation/sanitization style, same `notifyStaffSafe` staff-alert
call) creates a real `Complaint` with `source: "FOOTER"`; new
`/complaint` page + `actions.ts` (same structure as `/product-request`)
with name/email/phone/subject/message fields; added
`STAFF_ALERT_TYPES.COMPLAINT` (`"complaint.new"`) alongside the existing
alert types, notifying staff with a link straight to
`/admin/contacts/[id]`. Updated both places "Report a problem" appeared
— the footer CTA button (`footer-cta-buttons.tsx`) and the Policies
column link list (`footer-nav.ts`) — to "Complaint Box" → `/complaint`,
after confirming via grep those were the only two occurrences. Left
`/contact` itself untouched — it's still the real destination for the
separate "Contact form" link in the footer's Contact-us column, a
different, legitimate use.

`tsc --noEmit` clean, `eslint` clean on all 6 touched/new files.
Verified against real Postgres: called the real `createComplaint()`
function directly, confirmed the resulting row has `source: 'FOOTER'`,
confirmed it's actually returned by the real
`loadAdminContactList()` (the same function the admin Contacts page
calls) with the source correctly mapped to `"footer"`, then deleted the
test row and confirmed zero remained. Confirmed live: `/complaint` 200
with the real form, footer shows "Complaint Box" in the live rendered
HTML, `/admin/contacts` still 307-redirects signed-out.

AD-283 Real "hero side images" (`home-hero.tsx`'s right-hand column) —
direct follow-up to AD-282. Operator shared a reference screenshot
(Ryans Computers homepage: big slider left, 2 stacked promo images
right) and asked for that exact layout with an admin add-system for
both sides. The left slider was already real as of AD-282; the right
2-image column (`SIDE_PROMOS`) was still the last hardcoded piece —
fixed Unsplash stock photos with zero admin control.

Reused the exact same real `HomeBanner` system a third time: added a
`"hero-side"` slot (still no schema change — `HomeBanner.slot` is a
plain string) and a matching "Hero side images" section on the admin
banners page (same add/edit/delete pattern as Hero slider/Flash Deal).
Deliberately a **separate slot from the existing `"promo-tile"`** even
though both are visually "promo tiles" — `promo-tile` already means the
mid-page paired strips between product rails (`HomePromoBanners`), a
different placement; reusing it for the hero-side column would have
let editing one section silently move banners into the other.

`home-hero.tsx` now takes real `sideBanners` from
`getStorefrontHomeBanners("hero-side")`, capped at 2 (`SIDE_IMAGE_LIMIT`,
matching the reference layout's fixed 2-tile design) — deleted the
hardcoded `SIDE_PROMOS` array and `unsplash()` helper entirely. Handles
all 4 real combinations rather than assuming both sections are always
filled together: hero+side → the reference 2fr/1fr split; hero only →
slider goes full width; side-only → the 2 images show as a plain row;
neither → the whole hero section is empty (just the sr-only `<h1>` and
the service bar), matching the AD-272/AD-282 "hidden until content
exists" precedent rather than ever faking a placeholder.

`tsc --noEmit` clean, `eslint` clean. Verified against real Postgres: a
round-trip script called the same `saveHomeBanner`/
`getStorefrontHomeBanners`/`deleteHomeBanner` functions the admin form
uses, created 2 real `hero-side` rows, confirmed correct order/fields,
deleted them, confirmed zero remain (real store left banner-free
afterward). Confirmed live: homepage still 200 with both hero sections
empty (correctly renders nothing above the service bar, no server
error) — the store now has 4 admin-manageable homepage banner sections
(Hero slider, Hero side images, Flash Deal, Today's deal tiles) all
through the one real, permission-gated, audited `HomeBanner` system,
with zero hardcoded/demo content left in the homepage hero.

**Follow-up "add demo images" (same session, no new code):** operator
asked to populate the two new sections so the layout is visible.
Seeded 3 real `hero` rows + 2 real `hero-side` rows by calling the exact
same `saveHomeBanner()` the admin form calls (not a raw SQL insert) —
real eyebrow/title/text/CTA copy and real internal hrefs (`/shop`,
`/pc-builder`, `/offers`, `/shipping`, `/category/desktops` — verified
`desktops` is the real category slug, not the parent `pcs-servers` the
old hardcoded version used), images from `images.unsplash.com` (the
exact same host every other seeded product image and media asset in
this database already uses — confirmed by querying real `ProductImage`/
`MediaAsset` rows before choosing this, not assumed; already allow-
listed in `next.config.ts`'s `images.remotePatterns`, no config change
needed). Confirmed live without a server restart (curled the homepage,
found the real titles/carousel markup in the rendered HTML). This is
real, editable, deletable content sitting in the same `HomeBanner` table
as anything the operator adds by hand — not a special "demo mode"; they
can edit or delete any of it from Design Studio → Banners & Sliders like
any other banner.

AD-282 Real homepage hero slider — operator (Banglish): "I don't see an
option to add [to] the slider, add that, and fix the slider — the
buttons aren't visible. Make it more beautiful if you can."

Found the exact bug behind the complaint: `/admin/design-studio/banners`
is literally titled "Banners & Sliders" and already real-manages two
sections (Flash Deal, Today's deal tiles via `HomeBanner` — AD-272), but
had **no slider section at all**. Meanwhile the homepage's actual top
hero (`HomeHero` → `HomeHeroSlider`, the very first thing every visitor
sees) was 100% hardcoded — a fixed `SLIDES` array of 3 Unsplash stock
photos with zero admin control, unrelated to the real `HomeBanner`
system already built for Flash/Tile. There was no bug to "fix" in the
admin UI because the feature to manage this slider had simply never
been built — confirmed by reading the admin page's source, not assumed.

**No schema change needed** — `HomeBanner.slot` is a plain Prisma
`String` (app-layer validated against `HOME_BANNER_SLOTS`), so adding a
`"hero"` slot value in `lib/design/home-banners.ts` immediately reused
every already-real piece: `getAdminHomeBanners`/`getStorefrontHomeBanners`/
`saveHomeBanner`/`deleteHomeBanner`, the generic `banner-actions.ts`
server actions (`design_studio.manage` permission, audit log,
`revalidatePath("/", "layout")` so a save goes live immediately), and
the same real admin media upload pipeline every other image upload
uses. Added a new "Hero slider" `StudioCard` to
`admin-banners-page.tsx` (add/edit/delete, same pattern as Flash Deal)
— explicitly following the AD-272 precedent of "hidden until one is
added" rather than faking a slide.

**Storefront rebuild** (`home-hero-slider.tsx`): deleted the hardcoded
`SLIDES`/`unsplash()` demo data entirely; the component now takes real
`banners: StorefrontHomeBanner[]` and renders nothing when empty
(`home-hero.tsx` correspondingly widens the side-promo column to fill
the space when there's no hero content, rather than leaving a broken
empty grid track). Fixed the actual "buttons not visible" bug: the old
prev/next controls were both crammed into the top-right corner as
unstyled `‹`/`›` text characters with no background — moved them to the
standard vertically-centered left/right edge position every user
expects on a carousel, as real circular buttons (`lucide-react`
Chevron icons, white chip, shadow, backdrop-blur) so they read clearly
against any slide image; dot indicators moved to bottom-center (was
bottom-left) with a wider "active" pill. Also fixed the actual "fix the
slider" complaint at a deeper level: the old version had zero
transition between slides (an abrupt `key`-swapped `<Image>`, an
instant cut) — slides are now all mounted and cross-fade via opacity
over 700ms, plus real autoplay (6s, pauses on hover) since a slider with
only manual arrows and no rotation is easy to mistake for "not working"
when a visitor doesn't touch it.

`tsc --noEmit` clean; one real `eslint` `react-hooks/set-state-in-effect`
error caught and fixed (a defensive `useEffect` clamping `index` when
`count` shrinks was unnecessary — `banners` is a static per-page-load
prop, and `go()`'s existing modulo already keeps `index` in range on
every navigation — removed the effect instead of suppressing the lint
rule). Verified against real Postgres: a round-trip script called the
exact same `saveHomeBanner`/`getStorefrontHomeBanners`/`deleteHomeBanner`
functions the admin form/actions call, created 2 real `hero` rows,
confirmed they came back in the right order with the right fields, then
deleted them and confirmed zero remained (left the store's real
homepage banner-free afterward, as found — no fake seed content left
behind). Confirmed live: homepage `/` still 200 with zero hero banners
(slider correctly absent, side promos correctly fill the space, no
server error in the dev log), `/admin/design-studio/banners` still
307-redirects signed-out.

AD-281 Product card corner badges (`ProductCard`) — direct follow-up to
AD-280, operator (Banglish): top-left should show the discount with a
nice background colour, right side keeps the deals/labels (the existing
admin-configurable custom labels), and a gradient would make it pop.

Top-left now shows a real `−{off}%` badge (`bg-gradient-to-br
from-secondary to-danger`, white bold text, shadow) whenever the
product has a genuine computed discount (`discountPercent()`, already
existed — real `compareAtAmount` vs `priceAmount`, unchanged); it takes
priority over the plain New/Sale `Badge` added in AD-280 (a product
that's both on sale and has a live discount now shows the more
informative "-8%" instead of a redundant "Sale" text). New/Sale badge
still shows when there's no computed discount (e.g. `isNew` with no
compare-at price). Top-right admin custom labels (`product.labels`,
already real/DB-backed) were untouched — exactly what the operator
asked to keep.

`tsc --noEmit` clean, `eslint` clean. Verified against a real discounted
catalogue product (`ridge-16-gaming-laptop`, real ৳164,900 vs real
৳179,900 compare-at) — confirmed the exact gradient badge markup with
the real "−8%" value in the live dev server's rendered RSC payload for
`/shop`, not just a code read-through.

AD-280 Product card visual polish (`features/catalog/product-card.tsx`,
the homepage/wishlist/catalog-grid `ProductCard`) — operator (Banglish):
"fekashe lagce" (looks pale/washed out), make the card more beautiful.

Diagnosed four concrete contributors rather than a vague "add polish":
the card's border was `border-border/70` (70% opacity — nearly
invisible against the page's own light-gray background), there was no
resting shadow at all (only appeared on hover), the "New"/"Sale" label
was plain gray uppercase text with zero colour or background, the
product-photo area had no backdrop tint (plain white-on-white for any
white-background product photo), and the "View" button was a bare
white/thin-border ghost button next to a solid teal "Add to cart" —
the contrast between the two made "View" look especially faded.

Fixes: border bumped to full `border-border` + a permanent `shadow-sm`
(was hover-only); the New/Sale label now uses the existing `Badge`
component (`components/ui/badge.tsx`) — already had `tone="new"`
(info-blue tint) and `tone="sale"` (danger-red tint) defined, just never
used on the storefront card, so this reused an existing primitive
rather than inventing new colours; `productLabel()` now returns
`{text, tone}` instead of a bare string to carry the tone through; the
image container got a `bg-surface-muted` backdrop; the "View" button
now has a `bg-surface-muted` fill at rest so it reads as a real button
instead of empty space next to "Add to cart".

`tsc --noEmit` clean, `eslint` clean. Verified live: restarted dev
server, curled the homepage, grepped the returned HTML for each new
class string (`bg-info/10` badge, the new border/shadow string, the
filled View button, the `bg-surface-muted` image backdrop) — all
present in the actual rendered output.

AD-279 Storefront icon polish — operator (Banglish): "the icons used on
the frontend look too simple, add a bit more beautiful icons —
everywhere."

Audited icon usage across all 37 storefront files that import
`lucide-react` before touching anything, since "everywhere" needed
scoping. Found the codebase already has an established, good-looking
pattern in several places — a tinted circular/rounded chip behind the
icon that inverts to solid on hover (`home-categories.tsx`,
`home-service-bar.tsx`, `home-trust.tsx`, the mobile-nav drawer) — but
the highest-visibility spots on the site (present on literally every
single page) were still bare, flat, no-background line icons: the
header action icons (cart/wishlist/compare/account/menu — all four
share one constant, `HEADER_ACTION_CLASS`), the mobile bottom nav
(5-item tab bar, mobile-only but on every page), the footer phone
contact icon, and the product-card hover-actions (wishlist/compare/
quick-view overlay on every product card everywhere in the catalogue).
Deliberately did NOT touch the thin top utility bar (`top-bar.tsx`,
14px inline icons) — a background chip at that scale would look
cramped/forced, not "more beautiful."

Applied the same proven tinted-circle-with-hover-invert pattern
consistently to the bare spots rather than introducing a new icon
library or a duotone/filled icon style — lower risk, visually
consistent with what's already working elsewhere on the site:
- `components/layout/header-action-class.ts` — the single shared
  `HEADER_ACTION_CLASS` constant (used by cart/wishlist/compare/
  account/mobile-menu, 4 files) now renders a soft white-tint circle on
  the dark header (`bg-primary-foreground/10`) that inverts to a solid
  white circle with dark icon on hover — one change, four places fixed.
- `components/layout/mobile-bottom-nav.tsx` — the active tab now sits
  in a solid `bg-primary` circle; inactive tabs stay bare (deliberate —
  a persistent 5-item tab bar with every icon chipped would look busy;
  only the "you are here" one needs the emphasis).
- `components/layout/site-footer.tsx` — the phone contact icon now
  sits in a small teal-tinted circle (`bg-primary/15`), matching the
  colour the phone number/email links already use; left the inline
  "Contact form" map-pin icon bare since inline-link glyphs
  conventionally stay minimal.
- `features/catalog/product-card-hover-actions.tsx` — wishlist/compare/
  quick-view buttons went from a flat bordered square to a soft-
  shadowed circle with a colour-tinted hover state (was plain
  gray-on-hover).
- `features/lists/product-list-actions.tsx` — same treatment applied to
  the icon-only wishlist/compare buttons used elsewhere (e.g. product
  detail page).

`tsc --noEmit` clean, `eslint` clean on all 5 touched files. Confirmed
live: restarted the dev server and curled the homepage, `/shop`, and a
real product page (all 200), grepping the returned HTML to confirm each
new class string is actually present in the rendered output (not just
compiled without error) — the closest verification available without a
browser automation tool in this environment.

AD-278 Polished the admin topbar and sidebar — direct operator follow-up
to AD-277: "remove this" (the "Central hub of your business · Live from
PostgreSQL" subtitle line under the Dashboard heading) plus a request
(Banglish) to make the topbar and sidebar "more beautiful, easy,
professional, so it's easy to use."

Removed the subtitle line from `admin-dashboard.tsx` and dropped the
now-fully-unused `generatedAtLabel` field from `DashboardSnapshot`/
`load-dashboard.ts`/`emptySnapshot()` (grepped first — confirmed nothing
else read it).

Audited the topbar/sidebar for real usability problems rather than only
restyling, and found one genuine landmine: the profile avatar button in
`admin-topbar.tsx` had no dropdown at all — clicking it (once, no
confirmation) instantly signed the staff member out. Fixed with a real
`AdminProfileMenu` (same proven open/outside-click/Escape-to-close
pattern already used by `AdminOrderAlertBell`): shows the real signed-in
staff name + role + email, a "View storefront" link, and an explicit
"Sign out" menu item — signing out now takes two intentional clicks, not
one accidental one. Also added `title` tooltips to the icon-only topbar
buttons (Globe/Palette/Support/Contacts, previously icon-only with no
visible label) and subtle vertical dividers grouping the nav tabs /
utility icons / profile into clearer visual sections.

Sidebar (`admin-sidebar.tsx`): added a real accordion — opening one of
the 14 nav groups now collapses whichever other group was manually
opened, so the menu doesn't turn into one long scroll when several
sections get explored (the group containing the current page still
auto-expands on load, unchanged); added a "No menu items match…" empty
state for the search box (previously: a no-match search silently
rendered nothing, no feedback); added a small white left-accent bar on
the active nav item and active group for a clearer at-a-glance "you are
here" cue on the dark sidebar background.

`tsc --noEmit` clean, `eslint` clean on all 5 touched files
(`admin-dashboard.tsx`, `dashboard-types.ts`, `load-dashboard.ts`,
`admin-topbar.tsx`, `admin-sidebar.tsx`), `/admin` still correctly
307-redirects when signed out. **Disclosed boundary:** same as AD-277 —
no authenticated in-browser visual check was possible (no browser
automation tool available in this environment); verification relied on
static type/lint checks plus the redirect check, since both files are
pure presentational client components with no data-fetching logic to
independently cross-check against Postgres.

AD-277 Redesigned `/admin` dashboard — operator request (Banglish):
"purtota shundor kore aro professional vabe shajao" (make the whole
thing more beautiful/professional), with real data, more informative
content, and better graphs.

Audited the existing dashboard first rather than treating it as a pure
styling task, and found it wasn't actually presenting real data
end-to-end despite reading from Postgres: the "All time sales" bar
chart's `sales.chart` was always `[]` (hardcoded empty — the chart
never rendered any bars); every category/brand "top" row had a
hardcoded `value: money(0)` (which is exactly why the screenshot the
operator sent showed ৳0 next to every category and brand); `topProducts`
had a hardcoded `category: "—"` (never a real category name); the
loaded `recentOrders` data was computed by the loader but never
rendered anywhere; and the UI itself had non-functional decorative
chrome — `AdminPeriodTabs` (Today/Week/Month/All buttons with no
`onClick`, purely cosmetic) and clickable-looking brand-filter chips
that also did nothing — plus 3 separate widgets ("Top products by
sales", "Top brands & products", and the Row 3 top-products table) all
rendering literally the same 5 products, and a "Store overview" card
that mostly duplicated Row 1's stats. Decided a real fix had to replace
the data, not just restyle the cards around fake zeros.

**Data layer (`lib/admin/load-dashboard.ts`, `lib/admin/
dashboard-types.ts` rewritten):** real 14-day day-by-day paid-sales
trend (reused the existing `planCustomRangeBuckets`/`fillBuckets` helpers
from Report Center's real bucketing logic, AD-270, instead of inventing
a second time-bucketing approach); real top-5 categories and top-5
brands by revenue via raw SQL joins (`OrderItem` → `Order` → `Product`
→ `Category`/`Brand`, `paymentStatus = 'PAID'`, same join pattern
already used for `topBrand` in Report Center) with a real `sharePercent`
(each item's revenue ÷ all-time paid revenue, not a relative-to-max
fake percentage); real product category names on `topProducts` via the
same join; real month-over-month revenue growth percent (null — shown
as "New this month" rather than a misleading 0% or Infinity — when last
month had no paid sales); real average order value (all-time paid
revenue ÷ paid order count); real "new customers this month" count. Cut
the dead "Confirmed order" status row (`CONFIRMED` isn't a real
`OrderStatus` enum value — the real enum is Pending/Processing/Shipped/
Delivered/Cancelled, 5 not 6 — that row was permanently stuck at 0/0%
by construction). Removed the redundant duplicate fields from the type
(`store`, `topCategories`, `topBrands`, `brandChips`, `brandProducts`)
after confirming via grep they were referenced nowhere outside the
dashboard's own loader/type/UI files.

**UI layer:** new `AdminTrendChart` (real inline SVG area/line chart,
`features/admin/dashboard/admin-dashboard-widgets.tsx`) — no chart
library added, matching this codebase's existing lightweight custom-bar
convention (`AdminMiniBarChart`/`AdminHorizontalBars` in the analytics
feature) rather than introducing a new dependency; new `AdminDeltaBadge`
for real "+X% vs last month" / "New this month" indicators. Consolidated
the 3 duplicate top-products widgets into one real table with rank
badges and real category names. Replaced the fake brand-chip filter and
decorative period tabs with real content: a dedicated "Revenue trend"
card, a real "Recent orders" table (5-column: order/customer/placed/
payment+fulfillment badges/total — surfacing data the loader already
computed but the old UI never rendered), and real proportional revenue
bars for top categories/brands (share-of-revenue, not a decorative
placeholder). Removed the now-unused `AdminPeriodTabs` export after
confirming (grep) nothing else imported it.

Verified against real Postgres: a cross-check script independently
re-queried customer/product/order totals and the paid-revenue sum via
separate direct Prisma calls and confirmed every figure in the loader's
snapshot matched exactly; confirmed the 14-day trend always returns
exactly 14 buckets; confirmed every category/brand `sharePercent` falls
in a real 0–100 range; confirmed every `topProducts` row now carries a
real category name instead of "—". `tsc --noEmit` clean, `eslint` clean
on all 4 touched files, `/admin` route still correctly 307-redirects
signed-out (auth gating unaffected). Full authenticated visual
confirmation in a real browser was not done — no browser automation
tool is available in this environment, and replicating a Next.js
server-action login purely via curl (server actions require a live,
build-specific action id) was judged not worth the complexity versus
the signed-out redirect check plus the independent real-data
cross-check; this boundary is disclosed rather than claimed as full
UI verification, consistent with how every other admin-only page in
this project has been verified throughout this session.

AD-276 Built the real PC Builder compatibility system — operator asked
(Banglish, explicit "analyze first" instruction) whether all components
were tagged into slots, and for a real system so that selecting e.g. a
motherboard suggests only genuinely compatible parts (no "ulta palta"
wrong suggestions), covering product tagging → live build selection →
order traceability end to end. Delivered a written analysis first (per
instruction), then built after explicit go-ahead ("full sytem ta kivabe
build kora jay?").

**Analysis findings (confirmed via a research agent tracing real data
flow before any code):** compatibility checking existed only as a
post-hoc warning/hard-block on the review step, never a live filter
while picking parts; real product-tagging data was sparse (14/25
products, mostly one instance per slot — a data-entry gap, not a code
bug); no order/cart ever recorded which line items belonged to which
PC build; a real `storageInterface` attribute already existed in the
pure domain type layer (`lib/domain/pc-builder/`) with zero Prisma
column backing it. Delivered as a 3-step build plan: (1) data
foundation, (2) live filtering, (3) order/cart traceability.

**Step 1 — data foundation.** Added real `Product.builderStorageInterface`
column (migration `20260909155028_pc_builder_compat_and_traceability`),
wired through the full dual write-site chain (`DETAIL_SELECT`/
`CANDIDATE_SELECT`, `productData()` update block, the separate literal
create block, mappers, `product-repository.ts`) — same dual-create/
update pattern as the AD-274 `weightGrams` fix. Added a new controlled-
vocabulary layer (`lib/domain/pc-builder/attribute-options.ts`): fixed
common-value lists for socket/RAM type/form factor/storage interface,
each with an explicit "Other…" escape hatch in the admin product form
(new `AttributeSelectWithOther` component) so uncommon real values
still work — server-side validation deliberately stays length-only, not
a hard allowlist, so "Other" is never blocked. Bulk CSV import still
deliberately excludes all builder attrs (unchanged AD-274 scope
decision).

**Step 2 — live suggest-as-you-pick filtering.** New pure function
`rankCandidatesForSlot()` (`lib/domain/pc-builder/compatibility.ts`)
reuses the existing tested `evaluateCompatibility()` engine itself: for
each candidate it builds a hypothetical parts array (already-selected
real parts + this candidate), evaluates it, and keeps only the warnings
that actually involve the target slot — so an unrelated mismatch
elsewhere in the build can never hide an otherwise-fine candidate
(verified with a dedicated test case). `/pc-builder/select/[slot]`
(client-side, since build selection lives in `useBuilderStore`/
localStorage, not server/URL state) now fetches the real selected
parts + real enabled rule types via the existing `loadCompatibilityParts`/
`loadEnabledRuleTypes` server actions, ranks every candidate, and hides
definite ("incompatible") mismatches by default behind a real toggle —
"unknown" (missing data on either side) is never hidden, matching the
engine's existing never-claim-false-compatibility philosophy. Cards
that are shown while incompatible (via the toggle) get a red-tinted
style, a reason banner, and an "Add anyway" secondary action instead of
a silent block.

**Step 3 — order/cart traceability.** Added `buildBatchId` (a plain
`randomUUID()`, one per "Add build to cart" action, shared across all
its lines) + `builderSlot` to both `CartItem` and `OrderItem` —
deliberately a soft/informational tag, not an FK to `PCBuild`, since
saved builds are independently prunable (capped at 12/user). New
`addBuildItemsToCart()` (`lib/cart/persist.ts`) generates the shared
batch id and writes each line with its slot; `create-order.ts` copies
both fields straight through from `CartItem` to `OrderItem` (same
pattern as the existing `colorName`/`colorHex` copy). Admin order
detail now shows a "PC Build" badge on any line item that came from a
build.

**Verification (real Postgres, not just unit tests):** extended
`scripts/pc-builder/check-engine.ts` from 38→**44 checks** (6 new,
covering `rankCandidatesForSlot`'s matching/mismatching/missing-data/
no-selection/warning-isolation behaviour), all passing. A real-Postgres
script (written, verified, then deleted per convention) confirmed:
`builderStorageInterface` round-trips through a real product save;
`rankCandidatesForSlot` correctly ranks synthetic RAM candidates
against a real catalog motherboard's real `ramType` (`volt-b650-board`,
DDR5) — match → "ok", mismatch → "incompatible"; `addCartItemForOwner`'s
new `buildMeta` param writes the exact right `buildBatchId`/
`builderSlot` to real `CartItem` rows for a real user; all test data
cleaned up and confirmed removed afterward. The `CartItem`→`OrderItem`
copy-through in `create-order.ts` was validated by code inspection +
clean `tsc` (real `DbBuilderSlot` enum, no unsafe casts) rather than a
full live order placement, because all 3 real `ShippingMethod` rows are
still `isActive=false` (pre-existing, unrelated environmental condition
from AD-254, not touched) — `placeCustomerOrderForUser` hard-requires
`locked.shippingMethod`, so no order can be placed at all right now,
mock or real. `tsc --noEmit` clean, `eslint` clean on every touched
file (some pre-existing unrelated errors remain elsewhere in the repo —
`admin-media-picker.tsx`, `send-to-pathao-modal.tsx` — none in files
this task touched), `npm run test:payments` 47/47, live routes checked
(`/pc-builder/select/motherboard` and `/select/ram` → 200; the 3 admin
PC Builder routes → 307 auth redirect, as expected when signed out).

**Disclosed, explicitly out of scope for this task:** real product
builder-slot tagging is still sparse (14/25 products) — this is a
data-entry task for the operator, not something this code change fixes;
the compatibility system will only suggest well once more real products
carry real `builderSocket`/`builderRamType`/`builderFormFactor`/
`builderStorageInterface` values.

AD-275 Made the 3 admin PC Builder pages real (/admin/pc-builder,
/rules, /builds) — operator request. Audited all 3 first: findings were
a genuine mixed bag, not uniform mock.

**Compatibility rules (/admin/pc-builder/rules) — already real,
confirmed not rebuilt.** Real `PCCompatibilityRule` model, and toggling
a rule genuinely changes what the live storefront's
`evaluateCompatibility()` checks (`lib/domain/pc-builder/
compatibility.ts` reads `listEnabledRuleTypes()`). No work needed;
verified this claim rather than trusting it, then moved on.

**Saved builds (/admin/pc-builder/builds) — was the clearest kind of
bug**: the real storefront save-a-build flow (`lib/pc-builder/
saved-builds.ts`) already writes real `PCBuild`/`PCBuildItem` rows for
signed-in customers, but the admin page imported `MOCK_PC_BUILDER_BUILDS`
directly and showed 5 fake rows ("Rahim Uddin", "Sadia Khan"...)
regardless of what was actually saved — same shape as the AD-267
Facebook Catalog Products bug (real data existed, admin page just never
looked at it). Fixed with a real loader
(`lib/pc-builder/admin-builds.ts::getAdminPcBuilderBuilds()`) reading
the same `PCBuild` table, real owner label (customer name or "Guest"),
real component count, real share link (only when a real `shareSlug`
exists — schema already had `isFeatured`, no migration needed for
that), and a real featured-toggle save action. Deleted the now-dead
`MOCK_PC_BUILDER_BUILDS`/`getPcBuilderBuildById` exports after
confirming zero remaining references (kept `MOCK_PC_BUILDER_RULES` in
the same file — still legitimately used as the rules page's
`DATA_SOURCE=mock` fallback).

**Overview/Settings (/admin/pc-builder) — the one requiring a real
scope decision, asked rather than assumed.** This page's "Enable PC
Builder" master toggle and per-slot enabled/required flags had zero
backing schema at all. The real question wasn't "mock vs real save" —
it was whether making it real should also change what customers see:
the live storefront's slot list (`lib/domain/pc-builder/slots.ts`'s
`BUILDER_SLOTS`) is imported directly, synchronously, by ~5 real,
already-tested, working storefront files (slot list, part-picker
sidebar, the `[slot]` select route, cart conversion, sharing) — making
it DB-driven would mean converting a deliberately pure/sync domain
module to async across all of them, real regression risk to a working,
tested feature (confirmed 38/38 `test:pc-builder` checks still pass
after this task, unchanged). Asked the operator (AskUserQuestion):
persist-only (same scope choice as Currency format/Feature Flags/
Watermark earlier) vs. apply live. **Chose persist-only.**

New `PcBuilderSettings` (singleton master toggle) + `PcBuilderSlotConfig`
(one real row per actual `BuilderSlot` enum value — 11 slots, not the
old mock's approximate 8 with wrong ids like generic "storage"/"cooler"
that don't match the real `cpu_cooler`/`ssd`/`hdd`/`case_fans` enum
values) models. Real save actions gated on `pc_builder.manage` — a
permission key the audit found already defined but never actually
referenced by any route or action until now. UI copy states plainly
that these settings don't yet affect the live storefront, right next to
the real, live-affecting Rules tab, so the distinction is honest and
visible in the same page, not just buried in a memory file.

Verified against real Postgres: settings save/read round-tripped
exactly (disabled the master toggle, disabled+un-required the monitor
slot, confirmed both real), an unknown slot id was rejected, everything
restored to its exact original state afterward; a real test `PCBuild`
(real user, real product, real `PCBuildItem`) was created directly,
confirmed the admin loader surfaced it with the exact right owner
label/component count/status, toggled it featured through the real
action and confirmed `isFeatured` flipped in the database, cleaned up
after. `tsc --noEmit` clean, `npm run test:payments` 47/47, **`npm run
test:pc-builder` 38/38** (confirms the untouched pure compatibility
engine has zero regression), `eslint` clean, all 3 admin routes plus
the live storefront `/pc-builder` route verified (307/200 respectively
via direct curl, after Node's `fetch` in the verification script showed
the same cache-y 200-instead-of-307 artifact seen in the AD-274
verification — recognized immediately as the same known script quirk,
not re-investigated as a new issue).

AD-274 Made product bulk import + export real at /admin/catalog/import
and /admin/catalog/export — operator request: a designed CSV with real
fields for bulk import, and a matching export.

Audited both first (research agent): **Import was 100% mock** — it
didn't even read the uploaded file, just toasted "queued (mock)"; its
template CSV used fake numeric `unit_id`/`attribute_ids`/
`warranty_note_id` columns that don't correspond to any real schema
field or the real product-save function's actual input shape at all.
**Export was already real** (separate route, `/admin/catalog/export`)
but only 12 of the ~20 fields a real product needs, and — a genuine bug
found while investigating, not assumed — silently capped at 48 rows via
the shared storefront-listing repository's `MAX_PAGE_SIZE`, even though
it requested 500; harmless today (real catalog is ~26 products) but
would have silently truncated exports once the catalog grew past 48.

**Import**: added the codebase's first real CSV *parser* (`papaparse` —
a genuine new dependency; every prior CSV feature this session only
ever *wrote* CSV via hand-rolled `escapeCsv`, never parsed one, and
hand-rolling a correct RFC4180-ish parser for quoted/embedded-comma
fields wasn't worth the risk versus a well-established library). New
`lib/catalog/bulk-csv.ts` reuses the *exact* real single-product
validation/persistence path per row — `saveAdminProduct`/
`parseProductInput` — no parallel write logic. Real per-row semantics:
**SKU is the match key** — an existing SKU updates that product, a new
SKU creates one (idempotent: re-importing the same file twice doesn't
duplicate, confirmed in testing). Every row is independently try/caught
so one bad row can't abort the batch; the UI shows a real per-row
results table (row #, SKU, name, created/updated/failed, error text) —
this is genuinely new UX in this codebase, since every existing "bulk"
feature here is a checkbox-select + single aggregate result, not a
file-upload-with-per-row-report (checked customers, alerts, popups,
notifications — none had this pattern to mirror).

**Deliberately scoped down, disclosed in the UI, not silently
missing**: bulk CSV covers only flat/core fields (name, brand, category,
pricing, stock, position, weight, flags, warranty label, YouTube link,
one image, overview). Variants, colors, attributes, and spec groups are
NOT covered — those are nested per-row structures that don't map onto
flat CSV rows; the UI states this plainly and points to the
single-product editor for those. `brand`/`category` in the CSV are real
slugs (matching what `parseProductInput` actually expects), not the old
mock's fake numeric IDs.

**Found and fixed a real, directly-relevant pre-existing gap while
building this**: `weightGrams` (added in AD-254, feeds the real
weight-based shipping rate) was never actually settable through
`saveAdminProduct` at all — `ProductInputFields`/`parseProductInput`/
`persistParsed` had no field for it, so even the single-product admin
form couldn't set it, only the schema default (500g) ever applied. This
was a known, already-disclosed gap ("per-product editing not yet in
admin-product-form.tsx") — closing it end-to-end (new
`parseProductWeightGrams()`, threaded through both the update path's
shared `productData()` builder and the separate literal create-data
block) was small, directly served bulk import's own correctness, and
now benefits the single-product path too, even though its own form
still has no UI input for it yet (disclosed, not built — a distinct,
smaller follow-up).

**Export**: rewired to bypass the storefront repository's `MAX_PAGE_SIZE`
cap entirely — new `listAllProductsForExport()` queries Prisma directly
(the same pattern already established for report loaders), real cap
10,000 rows, documented. Export and import now share the **exact same
column set and order** (`BULK_CSV_HEADERS`), so an exported file can be
edited and re-imported directly — genuinely round-trippable, not just
superficially similar.

Verified against real Postgres: a real create (all ~15 fields checked
byte-for-byte against the database row afterward, including the newly-
real `weightGrams`), a real update via the same SKU on a second import
(confirmed no duplicate row, confirmed the changed price actually
applied), two deliberately invalid rows (missing brand, unknown brand
slug) correctly reported as failed with honest per-row error text
without aborting the other rows, real export row count matched the
real database product count exactly (not capped), the exported row's
values exactly matched what was in the database, and the export CSV
text contained the real test product. Cleaned up the test product
afterward. `tsc --noEmit` clean, `npm run test:payments` 47/47, `eslint`
clean, `/admin/catalog/import` and `/admin/catalog/export` (plus
`/admin/products`, homepage, checkout) verified live.
This closes out Design Studio: **all 8 of 8 sub-pages are now
genuinely real**.

Important correction discovered while investigating, not assumed:
AD-272's audit had described these 8 storefront pages (/about, /faq,
/contact, /support, /warranty, /shipping, /returns, /terms) as "already
working hardcoded content," implying rewiring them was riskier because
something real would be replaced. Reading the actual route files showed
this was wrong — every one of them was a genuine unbuilt placeholder
stub (`ContentStub`, literally "X will appear here"), not real content.
This meaningfully lowered the real risk of this task versus how it was
originally scoped: there was no working page being replaced, only an
empty one being filled in for the first time. Also confirmed no real
customer-facing contact FORM exists anywhere in the codebase — `/contact`
is CMS-editable static content only (address/hours/etc.), same as the
other 7; building an actual interactive contact form is a separate,
not-yet-requested feature.

New `ContentPage` model — `slug` restricted to a fixed known set of 8
(matches the 8 real existing storefront routes; arbitrary new-page
creation isn't supported, since Next.js needs a real route file per
page and there's no dynamic `[slug]` catch-all — the old mock's "Add
New Page" button was removed along with its now-nonfunctional `/pages/
new` route rather than left as a dead affordance). Body is real HTML,
sanitized via the *existing* `sanitizeBlogBody()` (`lib/content/
sanitize-html.ts`, built for the AD-264 blog editor) reused as-is — no
new sanitizer invented, same allowlist, same defense-in-depth posture
(sanitized again at render time, not just on save). Admin editor reuses
the *existing* `RichTextEditor` (TipTap, also built for AD-264) — no
new editor built either; both blog and CMS pages now share the exact
same real rich-text stack.

New `features/content/storefront-content-page.tsx` — one shared
component + metadata helper used by all 8 storefront `page.tsx` files
(each now ~15 lines), rendering real DB content when present or the
exact original placeholder copy when not (so nothing ever regresses to
truly blank). Seeded all 8 pages with their original placeholder text
as real initial `ContentPage` rows via a one-off script (not `prisma/
seed.ts`), so day one looks identical to before while now being
genuinely admin-editable.

Verified against real Postgres AND the live dev server with a
temporary script (deleted after use): saved real content containing a
`<script>` tag, an `onclick` handler, and a `javascript:` URL, confirmed
all three were stripped while a legitimate `https://` link survived
(with `rel="noopener noreferrer"` added); confirmed the real title,
sanitized body, and real meta title all appeared **in the live
`/about` page's actual HTML** fetched over real HTTP, with the raw
`<script>` tag confirmed absent from that live response; confirmed an
unknown slug is rejected (can't create arbitrary pages); restored the
real `/about` content to its exact original value afterward. `tsc
--noEmit` clean, `npm run test:payments` 47/47, `eslint` clean, all 8
storefront routes and all 8 admin edit routes verified live (200 / 307
to login respectively), homepage/checkout unaffected.

**This closes AD-272 and AD-273 together** — Design Studio started at
2 of 8 sub-pages genuinely real (Logo & Favicon, Footer Widgets) and
now ends at 8 of 8.

AD-272 Made Design Studio real (6 of 8 sub-pages) — operator request:
"make dynamic all features according to design, workable, connected to
frontend." Audited all 8 first (research agent): Logo & Favicon and
Footer Widgets were already real; Appearance, Typography, Banners &
Sliders, Auth Pages, Admin Navbar, and Pages (CMS) were fully mock
(local `useState`, every "Update" just toasted "(mock)" and discarded
on refresh). Also found a fully dead, orphaned localStorage config
system (`AdminDesignStudio`/`useDesignStudioConfig`/
`design-studio-mock.ts`) with zero real route references — deleted as
confirmed-dead cleanup.

Asked the operator to scope 3 real forks before building (AskUserQuestion):
(1) should Appearance/Typography/Auth/Admin-navbar actually change the
live rendered site, or just persist — chose **apply live**; (2) Banners
& Sliders needs a new CRUD table AND rewiring the storefront's
previously-hardcoded promo banners — chose **build it for real**; (3)
Pages (CMS) needs a new page-content model, HTML sanitization, and
rewriting several already-working storefront pages (/about, /faq,
etc.) — chose **defer**, its own dedicated task later given the size/
risk (comparable to the Custom Scripts stored-XSS decision).

**New schema**: `DesignThemeSettings` singleton (brand colors, font
choice, watermark settings — persisted but not yet applied to uploads,
disclosed in the UI; auth colors/illustration; admin-navbar colors) and
`HomeBanner` (real CRUD table, slots `flash-wide`/`promo-tile`/
`category` — only the first two are rendered anywhere on the
storefront today, so only those two are exposed in the admin UI;
`category` exists in schema for later use, not a fake affordance since
it's simply not shown yet).

**Appearance + Typography — genuinely live**: colors/fonts are real
Tailwind v4 CSS custom properties (`--color-primary`, `--font-sans`,
new `--font-heading`); saving them renders a real `:root{...}` override
`<style>` tag in the storefront layout only (not the admin panel — the
admin UI's own look is intentionally untouched, it never used these
shared tokens anyway). Pre-loaded 2 new real fonts via `next/font/google`
(Inter, Noto Sans Bengali) in the root layout alongside the existing
Plus Jakarta Sans, since `next/font` requires static imports — arbitrary
runtime font loading isn't possible, so the font picker is a small real
whitelist, not free text. Colors are validated with a strict
`^#[0-9a-fA-F]{6}$` regex before save — never trusted as raw CSS, so
nothing here can inject beyond a color value even though the value is
interpolated directly into a `<style>` tag.

**Auth pages — genuinely live**: `AccountAuthShell` (shared by /account/
login, /register, /forgot-password) now fetches real theme colors and
applies a real page-background + form-panel treatment, plus an optional
real illustration image — a light, real enhancement rather than
inventing a full split-screen redesign that didn't exist before.

**Admin navbar — genuinely live, with a disclosed partial scope**:
background color is fully dynamic. Text color is applied to the
highest-visibility elements (brand wordmark, active nav item, active
branch, active group) via a `--admin-nav-text` CSS custom property; the
various hover/muted opacity micro-states in `admin-sidebar.tsx` were
deliberately left as literal white rather than converted to
`color-mix()` everywhere — a bounded, real change to the parts that
actually read as "navbar text" without rewriting the whole file's hover
choreography for marginal extra effect.

**Banners & Sliders — genuinely real, replacing hardcoded content**:
new `lib/design/home-banners.ts` (real CRUD, images via the same real
`uploadAdminMediaFiles` pipeline every other upload uses). Deleted
`lib/catalog/promo-banners.ts` (the old hardcoded Unsplash demo
content) entirely — confirmed zero remaining references first. Rewired
`features/home/home-banners.tsx`/`home-page.tsx` to render real,
admin-managed banners; a slot with zero active banners now renders
nothing (matches this app's established "no fake data" convention)
rather than a placeholder. Seeded the 3 previously-hardcoded banners as
real initial `HomeBanner` rows via a one-off script (not `prisma/
seed.ts`) so the homepage didn't go visually blank the moment this
shipped.

Verified against real Postgres AND the live dev server with a
temporary script (deleted after use): saved real appearance colors and
confirmed the exact `:root{...}` override string appeared **in the live
homepage's actual HTML response** fetched over real HTTP; confirmed an
invalid hex color was rejected; saved real fonts and confirmed the
correct `--font-sans`/`--font-heading` CSS vars generated; saved real
auth colors and confirmed the real background-color literally appeared
in the **live `/account/login` page's HTML**; created a real marker
banner, confirmed it appeared on the **live homepage**, deleted it,
confirmed it was gone — all cleaned up and confirmed restored to the
exact original empty baseline afterward. `tsc --noEmit` clean, `npm run
test:payments` 47/47, `eslint` clean, all 8 Design Studio routes plus
homepage/login/register/checkout verified live. No dev-server restart
issues this pass beyond the routine post-migration one.

**Holding here for operator check-in** before Pages (CMS), the one
deferred item — per the agreed sequencing.

AD-271b Fixed a runtime error the operator hit live on
/admin/reports/product-sales right after AD-271/AD-270:
`AdminCategoryReportTable`'s `formatSecondaryValue` prop was a function
passed from a Server Component (`product-sales/page.tsx`) into the
`"use client"` table component — Next.js cannot serialize a function
across that boundary ("Functions cannot be passed directly to Client
Components"). Replaced the function prop with a plain serializable
`secondaryValueType?: "money" | "number"` flag; the client component
now does the ৳-prefix formatting itself instead of receiving a
formatter closure. Confirmed no other report/analytics page passes a
function prop across the server/client boundary (grepped all of
Report Center + the AD-267/268/269 integrations pages). `tsc --noEmit`
clean, `npm run test:payments` 47/47, `eslint` clean, live routes
verified (product-sales/reports/stock → 307 to login, homepage 200).

AD-271 Added a custom date-range filter to Earning Report
(/admin/reports), on top of the existing Today/Week/Month/All tabs —
operator's follow-up request: pick any single day or an arbitrary range
(e.g. 4 days) and get exact accounting for just that window, managed
separately from the fixed period tabs.

New `parseReportDateRange()` (lib/admin/report-time-buckets.ts)
validates two `YYYY-MM-DD` inputs (order, format, capped at 366 days)
and `planCustomRangeBuckets()` builds real daily buckets for ranges up
to 92 days (a single day correctly produces exactly 1 bucket, matching
the operator's own "ekdin hoy... 4din hoy" example) or monthly buckets
beyond that, reusing the exact same `fillBuckets()`/real-`$queryRaw`
machinery AD-270 already built — no parallel aggregation path.
`loadEarningReport()` gained an optional `customRange` param that, when
present, overrides the period tabs entirely for bucketing while every
other real accounting rule (PAID-only sales, COMPLETED-only refunds,
net-sales/expense breakdowns) stays identical to AD-270.

New `ReportDateRangeForm` in `admin-report-center-ui.tsx` — two native
date inputs + a "Show this range" submit (pushes
`?from=...&to=...`) and a "Clear" link back to the plain period-tab
view; shows a clear real confirmation ("Showing 2026-09-05 to
2026-09-08") or a real validation message, never a silent no-op.
`page.tsx` parses `from`/`to`, and CSV export filenames reflect the
active range instead of just the period name.

Verified against real Postgres: invalid ranges (reversed dates, bad
format, >366 days) all correctly rejected; a single-day range produced
exactly 1 bucket and a real test order's amount showed up as an exact
delta; a real 4-day range produced exactly 4 daily buckets and exactly
summed two real test orders placed on different days within it. Both
cleaned up, confirmed restored to baseline. `tsc --noEmit` clean, `npm
run test:payments` 47/47, `eslint` clean, live route confirmed
(`/admin/reports?from=...&to=...` → 307 to login, unauthenticated as
expected). No schema change.

AD-270 Rebuilt Earning Report + Product Sale Report from real Postgres,
confirmed Stock report already real, added CSV export to all 3 — first
3 of 7 Report Center pages, operator explicitly wants zero-mistake,
date/month-wise accurate accounting with CSV export since this is a
single-vendor store.

Audited all 7 report pages first (research agent) rather than assume
uniform scope: 6 were fully mock (fake hash-of-id numbers with zero
connection to real Order/OrderItem/Refund data, despite that data being
fully available); Stock was already half-real (`listAdminStockReportRows`
in lib/catalog/admin-inventory.ts, live whenever DATA_SOURCE!=mock,
which is always true here). Also found: Wishlist/Compare have real
unused Prisma models but the storefront features are localStorage-only
(never synced to accounts); Searches has no tracking model anywhere;
Wallet has no ledger and no real customer-facing recharge flow at all
(admin can only directly adjust a balance, confirmed matches the AD-256
note). None of these 4 could be made honestly "real" as a same-shaped
report fix — each needed an explicit scope decision, so asked the
operator (AskUserQuestion) rather than guessing: defer Wishlist/Compare
with an honest "not available" state (not built yet, later phase);
build a real WalletTransaction-style ledger for Wallet, explicitly
labeled as adjustments, not fake "customer recharges" (later phase);
CSV-only export (no new .xlsx dependency); build the 3 straightforward
real ones now, then check in before touching the other 4.

**Earning Report** (lib/admin/load-report-center.ts::loadEarningReport,
fully rewritten): real accounting rules, not approximations —
"sales" only counts `paymentStatus: PAID` orders (an unpaid/cancelled
order isn't real revenue); "refunds" only counts `Refund.status:
COMPLETED` (a requested-but-not-yet-paid-out refund hasn't actually
left the business). netSales ("Product Sales" / "Delivery" / "Tax" when
nonzero) is built from the exact same fields that sum to
`Order.totalAmount` (subtotal − discount + shipping + tax), so it
structurally cannot drift from the real total — no invented
percentages anywhere, unlike the old 92/8 and 35% hash-based splits.
Expenses breakdown now uses the real `RefundChannel` enum (Wallet/
Offline/Gateway) instead of a fake "Product Refund vs Delivery" split
that had no real per-refund breakdown to draw from. Added 2 new real
KPIs the mock never had: paid order count and average order value.

New `lib/admin/report-time-buckets.ts` — real date-wise (hourly for
Today, daily for Week/Month) and month-wise (12 real calendar months
for All) bucketing, UTC-based to match the existing month-start
convention already used in lib/admin/load-dashboard.ts (deliberately
not introducing a second timezone convention just for this report).
Real per-bucket sums come from `$queryRaw` with Postgres `date_trunc`
(the correct tool for grouped time-series accounting — Prisma's
`groupBy` can't truncate a timestamp column) for both the sale and
refund series, plus a real top-brand-by-revenue query
(OrderItem→Order→Product→Brand join, PAID orders only, scoped to the
selected period) replacing the old arbitrary "first brand in the list."
Missing buckets are filled with real 0s (`fillBuckets`) so a quiet
hour/day/month shows honestly as zero, not as a gap.

**Product Sale Report** (`loadProductSaleRows`, rewritten): real units
sold + real revenue per product from `OrderItem.groupBy` filtered to
PAID orders — every active catalog product is listed (including ones
never sold, shown as 0), not just movers, matching the report's
original full-catalog intent. Added a real "Revenue" column alongside
the existing unit count (`AdminCategoryReportTable` extended with an
optional secondary column + formatter, backward-compatible with
Wishlist/Stock which don't use it).

**Stock Report**: confirmed already real end-to-end (available =
quantity − reserved, denormalized `stockStatus` in sync) — only added
CSV export and a clearer "Available Stock" header, no data-layer change
needed.

**CSV export** (new `features/admin/reports/report-csv-export.tsx`,
mirrors the one existing pattern in admin-bulk-export.tsx — no new
dependency): Earning Report exports both a KPI summary CSV and a full
time-series CSV; Product Sale/Stock export the **entire real row set**,
not just the current page's slice — exporting a paginated slice would
silently produce an incomplete, misleading accounting export.

Verified against real Postgres with a temporary before/after delta
script (deleted after use, no dev-server restart needed — no schema
change this pass): inserted one real test Order (PAID, known
subtotal/shipping/tax) with a real product-linked OrderItem and one
real COMPLETED Refund on a known channel, then confirmed the loader's
output moved by *exactly* the right amounts on every figure —
totalSales, refunds, order count, the Product Sales/Delivery net-sales
lines, the Gateway expense line, the correct hour-bucket in both time
series, and the test product's unit/revenue delta — all exact, not
approximate. Cleaned up the test rows and confirmed the report returned
to its exact original baseline afterward. Also smoke-tested all 4
period tabs (today/week/month/all) for correct bucket counts and real
date/month labels. `tsc --noEmit` clean, `npm run test:payments` 47/47,
`eslint` clean, all 3 report routes verified live (307 to login,
unaffected homepage 200). No schema migration this pass.

Operator approved continuing through the remaining 4 pages in the same
pass rather than stopping. Completed all of them:

**User Searches**: new `SearchLog` model (query stored lowercased/
trimmed so grouping is correct without extra normalization at read
time). New `lib/search/log-search.ts::recordSearchQuery()`, wired into
the real storefront search page (`features/catalog/search-listing.tsx`,
right after the real `productRepository.list()` call, logging the real
result count) — fire-and-forget, wrapped so a logging failure can never
break real search results. `loadUserSearches()` now reads real
`SearchLog.groupBy` by query, ordered by count. Verified by hitting the
**real live `/search` route over real HTTP** (not just calling the lib
function) with a distinctive marker query, confirming a real row landed
and the report counted it correctly, then cleaning up.

**Wallet Adjustment Ledger** (renamed from "Wallet Recharge History"
everywhere — nav label, page title, report heading — since it never
was recharges): new `WalletTransaction` model + a real
`User.walletTransactions` relation. Extended `adjustCustomerWallet()`
(lib/admin/save-customer.ts) to write a real ledger row — amount,
balance after, optional reason, who made it — inside the *same*
transaction as the balance update, so the ledger can never drift from
the real balance. Added a second `window.prompt()` for an optional
reason on the existing wallet-adjust row action (matches the
established "simple, no new dialog" scope from AD-256). New
`loadWalletLedger()` reads real transactions joined to the real
customer. Verified against a real existing customer: real adjustment,
real ledger row with the exact right amount/balance/reason/staff email,
then reverted the balance and deleted the test ledger rows, confirmed
the real balance returned to its exact original value.

**Wishlist / Compare**: per the operator's earlier decision, deferred
honestly rather than built. `loadWishlistRows()` now returns
`available: false` and its `page.tsx` renders a plain `EmptyState`
explaining why (storefront wishlist is localStorage-only, not synced to
accounts) instead of the old fake per-product counts.
`AdminCompareReport` similarly replaced entirely — deleted the
`MOCK_COMPARE_ROWS` array and its search/filter UI, replaced with the
same honest `EmptyState` treatment (real `CompareList`/`CompareListItem`
models exist but are equally unused by the localStorage-only storefront
compare feature).

Removed now-fully-dead mock exports after confirming zero remaining
references: `MOCK_USER_SEARCHES`, `MOCK_WALLET_RECHARGES`, and the
`WalletRechargeRow` type from `lib/admin/report-center-mock.ts`.

Verified against real Postgres with a temporary script (deleted after
use): real end-to-end search logging via a live HTTP request to
`/search`, and a real wallet adjustment/ledger/revert cycle against an
actual existing customer row — both exact, both cleaned up, both
confirmed restored to baseline. Hit the session's documented
dev-server-vs-tsc conflict once mid-verification (ran `tsc --noEmit`
while `npm run dev` was still live from the prior phase, corrupting
`.next/dev/types/routes.d.ts` with nonsense syntax errors) — recognized
it immediately as the known false-alarm pattern (documented in Pending
Decisions), stopped the dev server, cleared `.next`, and got a clean
`tsc` result; also caught that the payment-security suite's count
legitimately drops from 47 to 45 when the dev server is down (2 checks
need live HTTP), which is expected/correct behavior, not a regression —
confirmed by restarting the server and seeing 47/47 again. Final state:
`tsc --noEmit` clean, `npm run test:payments` 47/47, `eslint` clean
(one intentional, harmless unused-param warning on the now-inert
`loadWishlistRows` category filter, kept for future real-implementation
drop-in), all 7 report routes verified live (307 to login), homepage/
checkout/search unaffected (200).

**This closes out the entire AD-270 Report Center task** — all 7 pages
are now either genuinely real (5: Earning, Product Sale, Stock,
Searches, Wallet) or honestly disclosed as unavailable rather than
faked (2: Wishlist, Compare), with real CSV export throughout.

AD-269 Made Custom Scripts real — third and last item of the AD-267
batch. Was fully mock: local `useState("")` on every load (no loader),
Save button just toasted "(mock)". No `CustomScript` model existed; no
injection mechanism existed anywhere in the storefront. Explicitly
flagged as deferred in PHASE_15.md specifically because of unresolved
stored-XSS risk from raw admin-textarea script injection — genuinely
needed a security-design decision before building, not a wire-up.

Asked the operator directly (AskUserQuestion) how to permission-gate
it, framing the real trade-off: the script content itself can't be
sanitized without breaking the feature (third-party tracking/chat
snippets ARE raw scripts by nature), so the real control is *who* can
save it — any staff account with access could otherwise plant a
skimmer or session-stealer storefront-wide. Operator chose a dedicated
new Admin-only permission over reusing the broader existing analytics
permission. New `custom_scripts.view`/`custom_scripts.manage`
permissions added to `lib/admin/feature-permissions-mock.ts` (the real
seed source, despite its filename) and to `MANAGER_DENIED`, then
granted to the Admin role only via a small targeted script —
deliberately did NOT re-run the full `prisma/seed.ts` for this, since
several of its upserts (e.g. `RefundReason`) unconditionally overwrite
fields back to their original mock defaults on every re-run, which
could have silently reverted real operator customizations built up
over this entire session; the targeted script only touched the new
`Permission`/`RolePermission` rows for the `role-admin` role. Route
gate (`lib/auth/admin-route-permissions.ts`) updated from the
leftover/mismatched `seo.view` to the new permission.

New `CustomScriptSettings` singleton model (migration
`20260909074456_custom_scripts_settings`), `lib/analytics/
custom-scripts.ts` (`getAdminCustomScripts`/`getStorefrontCustomScripts`/
`saveCustomScripts` — a 20,000-char cap per field against accidental
abuse, not a security control; audit-logs only the header/footer
*lengths*, never the raw script content itself). New gated "use server"
action file mirroring the existing analytics-actions.ts shape exactly.

Real storefront injection: first tried a client-side DOM-surgery
approach (rebuild `<script>` elements via `document.createElement`
after mount, since `.innerHTML` never executes scripts) but replaced it
with something simpler and better once reconsidered — a plain Server
Component (`components/analytics/custom-script-slot.tsx`) using
`dangerouslySetInnerHTML`, since content set this way is part of the
initial server-rendered HTML the browser parses natively, so `<script>`
tags execute exactly like any other inline script in the document — no
client bundle, no "use client", no DOM surgery, and genuinely
verifiable via a plain HTTP fetch of the rendered page (confirmed a
real test marker script byte-for-byte in the live homepage HTML, not
just present in application state). Header slot placed near the top of
the storefront layout, footer slot at the very end — this layout has no
literal `<head>` of its own (nested under the root layout's `<body>`),
matching this codebase's existing precedent that GTM/GA4/Pixel scripts
already inject via `next/script` from within the body tree, not a
literal `<head>`, without issue.

Hit and fixed the session's recurring client/server Prisma-leak bug
shape again mid-task, slightly differently this time: a value import of
a server-only constant (`CUSTOM_SCRIPT_MAX`) into the "use client"
`admin-analytics-nexa-pages.tsx` triggered `pg`/`dns`/`fs`/`net`/`tls`
module-not-found errors in the browser bundle — caught immediately by
restarting the dev server and reading its compile log (not by
`test:payments`, since this only broke the specific `/admin/*`
analytics pages, not the homepage HTTP check). Fixed by mirroring the
constant as a plain local value in the client file instead of importing
it — same fix shape as B2B (AD-257) and EMI (AD-243) before it. A first
restart alone didn't clear the error (stale Turbopack persistent cache
in `.next` from mid-edit compiles); clearing `.next` and restarting
resolved it — worth remembering as a follow-up step when a plain
restart doesn't clear a module-not-found error that the current source
no longer has.

Verified against real Postgres and the live dev server with a temporary
script: real save/read round-trip byte-for-byte, audit log recorded
exact lengths (not truncated/garbled content), an over-length input
correctly rejected with nothing saved, and — the real end-to-end proof —
a distinctive marker script saved through the real save function was
then found byte-for-byte in the *live homepage's actual HTML response*
fetched over real HTTP, then cleared back to empty afterward. `tsc
--noEmit` clean, `npm run test:payments` 47/47, `eslint` clean on every
touched file, live routes verified (custom-script/meta-capi/admin-seo →
307 to login, homepage/checkout → 200).

**This closes the entire AD-267 batch** — every one of the 11 pages the
operator listed together is now genuinely real: 8 needed no changes,
Facebook Catalog Products (AD-267) and Meta CAPI (AD-268) got new real
functionality, and Custom Scripts (AD-269) got a new real
security-gated feature.

AD-268 Made Meta Conversion API (CAPI) real — second item of the
AD-267 batch, operator-chosen. Was fully mock by explicit design (the
admin page stated "server events are not sent"; no CAPI HTTP call
existed anywhere; explicitly deferred in PHASE_15.md). Confirmed first
that the existing browser Meta Pixel only ever fires generic PageView
(no custom events client-side), so there's no dedup concern with a new
server-side event.

New lib/analytics/meta-capi.ts: `sendMetaCapiPurchase` posts a real
Purchase event to `https://graph.facebook.com/v21.0/{pixelId}/events`
using the Pixel ID already saved on the Meta Pixel admin page (no
duplicate ID stored) and a new `META_CAPI_ACCESS_TOKEN` env var — never
in the database, matching the SMTP_PASSWORD/SMS_API_KEY/GATEWAY_
SECRETS_KEY convention. Fails closed (no request attempted) if the
database is off, the Pixel is disabled, the Pixel ID is empty, or the
token env var is unset. Hashes email/phone (SHA-256, lowercased/
trimmed per Meta's spec) into `user_data.em`/`ph`; includes real client
IP/user-agent (via the existing `getRequestMeta()` helper) for match
quality; generates a real `event_id` per event. `sendMetaCapiPurchaseSafe`
is a fire-and-forget wrapper (mirrors `sendMailSafe`) so a CAPI failure
can never break checkout.

Wired into lib/orders/create-order.ts: fires once per real order,
right after the existing staff-notification call, using the real order
number/total/currency/items/customer email+phone — covers both hosted-
gateway and COD orders alike, since an order is genuine purchase intent
regardless of payment method (deliberately not gated on payment
confirmation, which would silently drop every COD Purchase event).

Updated the admin Meta CAPI page to show real live status (green "Live
— sending real Purchase events" / amber "Pixel enabled, but
META_CAPI_ACCESS_TOKEN is not set" / amber "Pixel is disabled") instead
of a static "not sent" notice, via a new `isMetaCapiConfigured()` check
that never reveals the token itself. Documented the new env var in
.env.example.

Verified against real Postgres with a temporary script: confirmed
`isMetaCapiConfigured()`/`sendMetaCapiPurchase()` fail closed with the
correct honest reason both when the Pixel is disabled and when it's
enabled but the token is missing — confirmed `META_CAPI_ACCESS_TOKEN`
is genuinely absent from `.env.local` first, so this exercised the real
fail-closed code path with zero risk of an actual call reaching Meta.
Test DB state (temporarily enabling the Pixel) was fully reverted.
`tsc --noEmit` clean, `npm run test:payments` 47/47, `eslint` clean on
all touched files, live routes verified (meta-capi 307 to login,
homepage/checkout 200). No schema change, no migration, no dev-server
restart needed.

**Holding here for operator approval before the last remaining item,
Custom Scripts** — per the operator's explicit instruction.

AD-267 First of an 11-page Analytics/Integrations/SEO batch, under an
explicit operator process instruction: complete one feature fully,
hold, ask, get approval, only then move to the next.

Audited all 11 first (research agent) rather than assume the whole
batch needed building. Genuinely good finding: 8 of 11 were already
fully real and connected to the live storefront — GA4, GTM, Merchant
Center settings + feed status, Facebook Catalog settings, Meta Pixel
(all real script injection confirmed by reading the actual storefront
injector, not trusting the admin page), the Sitemap admin page (a real
thin wrapper around the same source the live sitemap.xml uses), and
Global SEO (feeds real title/description/keywords into the storefront's
actual metadata). Only 3 gaps exist: Facebook Catalog's "Products" page,
Custom Scripts, and Meta Conversion API.

Fixed the smallest gap: Facebook Catalog "Products" had a fully fake
per-product assignment picker, but the real feed doesn't use any
per-product assignment — it independently serves every real active
product. The picker wasn't just unwired, it actively implied a
capability that doesn't exist. Exported the feed's own real product
query and rewrote the page as an honest read-only view of exactly what
the live feed serves; removed every fake action rather than half-fix
them, since none map to a real capability.

Verified against real Postgres: the admin page's product list is
byte-for-byte identical (by SKU) to a freshly-generated real feed XML,
confirmed by temporarily enabling Meta Pixel, generating the feed, and
diffing SKU sets, then reverting. `tsc --noEmit` clean, `npm run
test:payments` 47/47, live routes verified. No schema change.

**Holding here for operator approval before Custom Scripts or Meta
CAPI** — per the operator's explicit instruction, not proceeding
further until told which to do next (or that this one is approved).

AD-266 (prior session): Made Bulk SMS real — the last remaining item from the original
AD-258 Marketing audit — and re-confirmed Custom Visitors is still fully
real from AD-258 with zero changes needed (re-checked before touching
anything, since the operator named both URLs together).

Mirrors the Newsletter Campaign shape (AD-261): a real recipient list,
real per-message sending via the *existing* `sendSms()` single-send
function (built earlier for OTP), and real measured sent/failed
outcomes — no new send mechanism invented. One real improvement over
the pattern it borrowed from: implemented the "verified" audience
*correctly* using real `User.phoneVerifiedAt` (the actually-relevant
field for SMS) rather than copying the existing Send Custom Notification
feature's own shortcut, where "verified" silently behaves identically
to "all" — caught by reading that code directly rather than assuming
it was a safe pattern to copy.

New SmsCampaign model, lib/sms/campaigns.ts (`createAndSendSmsCampaign`,
real audience resolution for all/verified/recent), gated on the real
`otp.manage` permission. Confirmed `SMS_API_KEY`/`SMS_API_SECRET` are
unset in dev before testing (same precaution as AD-261's SMTP check) —
`sendSms()` fails closed before any network call when credentials or
the provider are missing, so the real send loop was exercised with zero
risk of an actual SMS going out. Verified against real Postgres: real
recipient counts matched direct queries for both audiences, the real
attempt failed with the real honest reason, empty input rejected. `tsc
--noEmit` clean, `npm run test:payments` 47/47, verified live.

**This closes the entire AD-258 Marketing audit** — every item found
mock in that original sweep is now real, across AD-258 through AD-266.

AD-265 (prior session): Made the blog post slug auto-generate live from the title as
it's typed, for new posts, stopping as soon as the operator manually
edits the slug themselves (tracked via a `slugTouched` flag) so a
deliberate custom slug isn't silently overwritten by further title
edits. Existing posts' titles no longer touch the slug at all — a
published post's slug is its real, possibly-already-indexed URL, and
silently changing it would break external links. Small client-side UX
fix; the existing server-side `savePost` slug validation/fallback was
already correct and untouched. `tsc --noEmit` clean, `npm run
test:payments` 47/47, /admin/blog/new verified live.

AD-264 (prior session): Added a real rich-text editor to the blog Body field. "Summer
not" (unclear in AD-262/263, guessed as "Summary") turned out to mean
**Summernote** — the operator spelled it out directly: "in body section
summernote is missing." Corrected the cross-session memory rather than
leave the wrong guess standing.

Chose TipTap v3 over literal jQuery Summernote — no jQuery dependency
(nothing else in this Next 16/React 19 app uses it), actively
maintained, real React integration — delivering the same toolbar
experience (bold/italic/headings/lists/quote/code/link/undo-redo) via
`@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link` +
`@tiptap/extension-placeholder`.

This carried real risk beyond prior UI work: Body moving from plain
text to real HTML creates a genuine XSS surface once rendered via
`dangerouslySetInnerHTML` on the live site, and needed a migration-safe
path for the 2 existing plain-text posts. New lib/content/
sanitize-html.ts (`sanitizeBlogBody`, using `sanitize-html`) strips
scripts/event-handlers/`javascript:` URLs server-side on every save —
the real security boundary, not just trusting the editor's output,
matching this session's established "verify server-side regardless of
client" posture. `looksLikeHtml()` lets the storefront post page choose
real-HTML rendering vs. the original paragraph-split rendering per
post, so existing content needs no migration. Added a shared
`.th-rich-text` CSS block so the admin editor and live page render
identically.

Verified directly against the real sanitizer AND the real save path
with a crafted payload (script tag + onerror handler + javascript: URL)
— confirmed all three are stripped while safe formatting and a
legitimate link (with `rel="noopener noreferrer"` added) survive.
Confirmed an existing legacy plain-text post still renders via the old
path with no regression. `tsc --noEmit` clean, `npm run test:payments`
47/47, verified live after a dev-server restart (new dependencies).

AD-263 (prior session): Rebuilt the blog editor into a professional SEO-focused form.

Pure editor-UX upgrade on top of AD-262's already-real data layer — no
new persistence gaps found. Sectioned the form (Content / Cover image /
Organize / SEO & sharing), added a real word-count/reading-time
estimate, a real slug→URL preview (new `siteOrigin` prop via the
existing `publicOrigin()` helper — deliberately not imported directly
into the client form since it reads a non-public env var), real
character-count SEO guidance with actual best-practice ranges (30–60
title / 70–160 description), and a live search-result preview that
computes the *exact same fallback logic* the real `generateMetadata`
uses — so what the admin sees while typing is what will actually
render, not a decorative mockup. Also a live social-share preview.

Found and fixed a real small gap while building this: `MediaAsset.alt`
already existed with a real update function used by the admin media
library, but blog never exposed it. Added a real cover-image alt-text
field (new `updateBlogCoverAltAction`) that saves on blur and threaded
`coverImageAlt` through the real read/write paths and the storefront's
`openGraph.images[].alt`.

Verified against real Postgres: real upload → real post → real alt-text
save → confirmed it round-trips through both admin and public reads.
`tsc --noEmit` clean, `npm run test:payments` 47/47, both blog admin
routes verified live. No schema change, no migration needed.

AD-262 (prior session): Verified Blog + Blog Categories and completed the "full SEO
system" ask. Unlike recent tasks, this one started by re-checking an
earlier audit's claim ("Blog is already REAL end-to-end") rather than
building from mock — and the core claim held up: real models, real
admin CRUD, real slug-uniqueness, storefront pages already correctly
PUBLISHED-only, already in the real sitemap. Confirmed "if add any post
it show to the website" was already true, verified with an actual real
post creation, not just re-reading code.

What was genuinely missing: cover images (the schema had
`BlogPost.coverMediaId` all along, completely unwired — no upload UI, no
action, no storefront display) and richer per-post SEO metadata (plain
title/description only; no OG image/type/canonical, no Twitter card, no
structured data anywhere in the app at all, not just blog). Wired cover
images through the existing real admin media pipeline (same one
Popups/Alerts reuse) and exposed both the resolved display path and the
raw media id on the admin type — the latter matters because without it,
saving unrelated field changes would silently wipe a post's cover image
every time, since the form only ever sees the resolved path. Verified
this exact regression doesn't happen. Added real `alternates.canonical`,
`openGraph` (type: article, real cover image, publishedTime), Twitter
card metadata (mirroring the product page's existing OG pattern, not a
new convention), and real BlogPosting JSON-LD structured data — the
first structured data anywhere in this codebase, scoped to blog only
since that's what was asked, not retrofitted onto product pages too.

Verified against real Postgres end-to-end (real image upload, real
published post with cover+SEO fields appearing immediately in both
public queries, draft correctly hidden, cover survives an unrelated
re-save) and confirmed live on the real running site: real JSON-LD, real
og:title/og:description/og:type=article, and a real canonical link tag
all present on an existing real post. One false alarm along the way —
a check appeared to fail because my own test script compared against an
un-normalized slug; confirmed via direct query that the real
`normalizeSlug()` behavior was correct all along, not a product bug. No
schema migration needed (the field already existed), so no dev-server
restart was required this round. `tsc --noEmit` clean, `npm run
test:payments` 47/47.

AD-261 (prior session): Made Email Templates and the Newsletter campaign gap real.
Newsletter's subscriber management was already real; the actual gap was
that no send-a-campaign capability existed at all (honestly disclosed
as "waits for a later phase," not faked). Email Templates was fully
mock — "Edit" was a bare toast with no editor.

Two decisions resolved by design, not by asking: (1) kept template
content real but not yet wired to automatic order-lifecycle sends — same
disclosed-gap pattern as NotificationTypeSetting (AD-258) — since wiring
~8 real trigger points touches order-processing code and is a separate,
bigger task; added a real "Send test email" button instead, using the
same SMTP sender as OTP/SMTP test-sends. (2) Building real campaign send
was safe because it reuses that exact same sender (no new send
mechanism) — the actual risk (an irreversible real email blast) was
handled by confirming SMTP_PASSWORD is unset in dev *before* testing, so
verification exercised the full code path (including real per-recipient
success/failure counting) without ever attempting a real network send.

New EmailTemplate model (seeded with the same 8 default transactional
types the mock had) and NewsletterCampaign model (real measured
recipientCount/sentCount/failedCount/lastError — status only becomes
"sent" if at least one send actually succeeded). New real editor dialog
for templates; new compose-form + campaign-history UI on /admin/newsletter,
mounted above the existing unchanged subscriber list.

Verified against real Postgres: template edit/revert, enable/disable,
and test-send all behave correctly, with test-send correctly failing
closed ("SMTP host is not configured") proving no real send was
attempted; a real campaign against the one real subscribed row recorded
an honest failed outcome with the real SMTP error, not a fabricated
success. `tsc --noEmit` clean, `npm run test:payments` 47/47, all routes
verified live after the now-standard post-migration dev-server restart.

Only Bulk SMS remains deferred from the original AD-258 Marketing audit.

AD-260 (prior session): Made Custom Sale Alert real. This one had a genuine privacy
question (showing real purchase data publicly means deciding how much
customer identity to expose) — resolved by design, not by asking:
`Order.shippingArea` (from the AD-254 District/Upazila work) already
gives a real, human-readable area label, so the toast shows real
product + real area + real order date, and the Prisma `select` clause
structurally cannot leak the customer's name/email/phone since those
fields are never selected. Also skipped the "real vs synthetic" question
posed for AD-258 Custom Visitors — real Order/OrderItem data already
exists in full here, so real was strictly less work than fabricating a
feed, not a genuine trade-off.

New SaleAlertSettings singleton (enabled, min/max interval, product
scope featured/sale/manual, manual product ids). New
lib/marketing/sale-alerts.ts — the core `getRecentSaleAlertEvents()`
maps real recent non-cancelled OrderItems to
`{productName, productSlug, areaLabel, placedAt}` only. New
components/storefront/sale-alert-toast.tsx rotates through the real
event pool at a random admin-configured interval, honestly showing the
real relative order date (never fabricated as "just now"). Admin page
rewritten with a real searchable product picker for "manual" scope
(deliberately not reusing the existing promo-product-picker-modal,
which is still typed against a mock catalogue). Known minor limitation,
not solved: can visually stack with a Custom Alert also set to
bottom-left (no cross-widget stacking coordinator built).

Verified against real Postgres: 8 pre-existing real orders already
produce correct events; created one throwaway order with a deliberately
suspicious customer name/email and confirmed via full-string search
that neither ever appears in the output while the real area name does;
invalid settings rejected; disabling empties the feed. Cleaned up and
reset to disabled defaults after. `tsc --noEmit` clean, `npm run
test:payments` 47/47, all routes verified live post-restart.

AD-259 (prior session): Made Custom Alerts real — a small dismissible corner toast
(bottom/top-left/right), genuinely distinct from the Dynamic Pop-up's
center modal. New Alert model (text, link/linkLabel, image, size,
colors, location, optional auto-close, enabled/locked). The old mock UI
had the same "fake global control" anti-pattern Popups had (location
was one global radio button affecting nothing); moved it to a real
per-alert field, and added a real "Link label" input the old form never
exposed even though the data always carried one. lib/marketing/alerts.ts
mirrors lib/marketing/popups.ts's shape (CRUD + real image upload +
`getActiveAlertForStorefront()`); new components/storefront/site-alert.tsx
renders it for real in the storefront layout, dismissible and
session-scoped like the popup but with its own storage key namespace.

Re-hit and documented a known gotcha: after `prisma generate`, the
already-running dev server keeps its old client in memory and throws on
the new model until restarted — this exact error surfaced live on
/admin/marketing/popups between sessions; fixed by restarting (no code
change), and proactively restarted again after this task's own
migration. Verified against real Postgres (enable/disable/bulk/delete
lifecycle, exact location/auto-close persistence). `tsc --noEmit`
clean, `npm run test:payments` 47/47, all routes verified live.

AD-258 (prior session): Audited Coupons + the full Marketing sidebar group (11 sub-pages)
via a research agent before touching anything. Coupons was already
fully real end-to-end (including real checkout redemption) — the best
existing example in the app, no work needed. Also already real:
Newsletters, Blog, Subscribers, Notifications → Send custom/History.
Six items were fully mock and needed genuine new architecture, not a
save-button wire-up (Dynamic Pop-ups, Custom Alerts, Custom Sale Alert,
Email Templates, Custom Visitors, Bulk SMS) — asked the operator to
prioritize; built Dynamic Pop-ups and Custom Visitors (real tracking,
per their explicit choice over a disclosed-synthetic number), deferred
the other four. Also fixed Notifications → Types/Settings directly
since those were plain mock-settings pages, not new-architecture calls.

New schema: NotificationTypeSetting (seeded with the same 11 default
order-lifecycle types the mock had, via prisma/seed.ts — explicitly not
yet wired to automatic triggers, since nothing creates a Notification
keyed to one of these today), NotificationSettings singleton, Popup
(matches the existing form's fields exactly, plus a new per-popup
delaySeconds replacing a fake global "duration" control),
ProductViewEvent (real page-view rows keyed to an anonymous per-browser
cookie — never IP/account — pruned opportunistically), and
VisitorWidgetSettings singleton.

Dynamic Pop-ups now genuinely render on the storefront — a new
components/storefront/dynamic-popup.tsx mounted in the storefront
layout next to the existing analytics/chat widgets, showing the first
enabled pop-up after its delay, once per browser session. Real image
upload reuses the existing admin media pipeline. Custom Visitors now
does real distinct-viewer counting (proven in testing: two events from
one viewer plus one from another correctly counts as 2, not 3) shown
per PDP request — no polling/websockets, which would have been
over-engineering for an accurate-as-of-page-load number.

Verified against real Postgres with a temporary script (popup
enable/disable/delete lifecycle, distinct-viewer counting, settings
validation) plus a re-check of the notification fixes. `tsc --noEmit`
clean, `npm run test:payments` 47/47, all routes verified live.

AD-257 (prior session): Made B2B (wholesale) real end-to-end. A research agent mapped the
full surface first: the real `B2BAccount`/`B2BStatus` schema (unique to
`User`) existed but was queried nowhere; the admin side was a
disconnected mock array; the storefront ran its own separate mock auth
system (localStorage session, plaintext password, fake file uploads,
hardcoded flat 12% discount ignoring the real per-account
discountPercent/tier). Since a B2BAccount can only belong to one real
User, the only correct design is "application on top of an existing
customer account" — so the whole parallel mock auth stack was removed,
not kept alongside a real one. Confirmed two open scope questions with
the operator first: real KYC document storage (chosen) — trade licence/
NID now go to a new private-uploads/b2b/ directory outside `public/`
(added to .gitignore), retrievable only via a new authenticated
/admin/api/b2b-documents route (deliberately under `/admin/...` since
the staff session cookie is Path=/admin); and discount scope — PDP
display only for now, not cart/checkout totals (keeps this out of the
security-critical order-pricing path).

Built lib/b2b/applications.ts (real apply/re-apply logic — blocks
duplicate PENDING/ACTIVE applications, allows re-applying after
suspension) + its "use server" action (requires a real customer
session), a real apply dialog (features/b2b/b2b-apply-dialog.tsx) with
actual file inputs, and lib/admin/b2b-accounts.ts + its gated actions
for the real approve/suspend/reactivate workflow. Rewired the PDP
(app/(storefront)/product/[slug]/page.tsx → product-media-buy.tsx →
product-summary.tsx) to compute the wholesale price for real via a new
pure lib/b2b/pricing.ts, replacing the hardcoded 12%, with correct UI
per real status (signed-out/no-account/pending/active/suspended).
Deleted 5 fully-superseded mock files after confirming zero remaining
references.

**Hit and fixed the session's recurring client/server Prisma-leak bug
mid-task** — a new "use client" admin component value-imported a helper
from a file that also has `getPrisma`, pulling `pg`/`dns` into the
browser bundle and 500-ing the *entire app* (caught immediately by
`npm run test:payments`'s HTTP checks, which hit the live homepage).
Fixed with the same established pattern as staff/customers: extracted
the pure client-safe pieces into a new lib/admin/b2b-list-shared.ts.
Confirmed fixed (47/47 payment checks, homepage 200 again).

Verified against real Postgres with a temporary script: real discount
math, a real apply with two genuinely-stored byte-correct documents,
duplicate-apply blocking, admin approve setting the right state, the
customer-facing lookup reflecting it exactly, suspend/re-apply
transitions, and a path-traversal read attempt correctly refused. `tsc
--noEmit` clean, `npm run test:payments` 47/47, PDP and admin B2B routes
verified live.

AD-256 (prior session): Made Admin → Customers real. List/detail reads were already
DB-backed (real `User` table); every write was fake — "Add customer",
the detail page's Status/Notes save, and every per-row/bulk action
(Ban/Unban, Mark/Clear suspicious, Wallet recharge, Delete, "Log in as
this customer") were all `notifySuccess (mock)` calls with no backing
logic. Asked the operator to scope 4 ambiguous/risky pieces before
building (AskUserQuestion, same pattern as AD-252/254): wallet recharge
uses a simple direct balance adjustment (no ledger table exists;
audit-logged, no queryable history — building a real ledger was the
explicitly-declined bigger option); "Delete" was dropped entirely rather
than kept as a deceptive relabeled-Ban button (Ban/Unban already covers
the real need); customer impersonation was removed rather than built
without dedicated security review (a real one needs its own audited
session mechanism); the B2B accounts section was left completely
untouched — it's a fully disconnected mock (fake companies not linked to
any real customer, plus a mock storefront B2B signup dialog) sitting on
a real `B2BAccount` schema, and making it real means designing an actual
approve/reject workflow — a distinct subsystem, not a wire-up, so it's a
separate future task.

Built new lib/admin/save-customer.ts (create with Argon2id password
hash — same helper Staff/customer login already use, no invite-token
flow exists so admin sets a real password directly, matching the AD-255
Staff pattern; profile update; ban/unban and bulk variants mapping to
real UserStatus; suspicious-flag toggle and bulk variant; wallet adjust
inside a transaction that rejects a deduction past zero) and
features/admin/customers/customer-actions.ts (permission-gated on the
real, already-seeded customer.add/customer.edit/customer.ban keys).
Rewired the form, detail page (also deleted a stale "arrives with Phase
11 authentication" banner — that phase has been live all session), row
actions (wallet amount via a plain `window.prompt()`, matching the
"simple" scope choice), and the list's bulk-action dropdown. Verified
against real Postgres with a temporary script: hashing, duplicate-email
rejection, ban/unban, suspicious toggle, wallet math (including the
over-deduct rejection), and bulk actions all confirmed correct; `tsc
--noEmit` clean, `npm run test:payments` 47/47, all touched routes live
with no 404/500 (B2B route confirmed still serving its untouched mock).

AD-255 (prior session): Made Admin → Staff real. Roles/permissions/audit log were already
fully DB-backed; the actual gap was the "Add staff"/"Edit staff" form
(used by /admin/staff/new and every /admin/staff/[id] edit) — it only
showed a fake "(mock)" success toast and never touched the database, and
since staff login has no self-serve registration, this form was the
ONLY intended way to create a staff account. New lib/admin/save-staff.ts
validates with the same shared account-validation rules customers use,
hashes passwords with the existing Argon2id helper, resolves the real
Role by key, handles duplicate-email conflicts cleanly, and blocks a
staff member from disabling their own account. New "use server"
staff-actions.ts gates create/update on the real staff.add/staff.edit
permissions (confirmed already seeded and granted to Admin, denied to
Manager). Also fixed a display bug: the list/detail read side ran every
real role through a crude 3-bucket (admin/manager/support) matcher
instead of showing the actual assigned role name — replaced with a real
`{id, key, name}` role reference throughout. Added a real Status field
(Active/Invited/Disabled) to the form so accounts can actually be
disabled. Deleted two now-fully-orphaned files (an old permissions-
matrix component and its supporting mock) after confirming zero
remaining references.

Verified against real Postgres with a temporary script: create stores a
genuine Argon2id hash, a replicated login-credential check succeeds/
fails correctly, duplicate email is rejected cleanly, self-disable is
blocked, disabling another account blocks its next login, and a
password change on edit actually takes effect. `tsc --noEmit` clean,
`npm run test:payments` 47/47, all /admin/staff* routes verified live
(307 to login, no 404/500). Full authenticated-browser UI testing wasn't
possible in this environment — same verification ceiling as AD-252/253/
254.

AD-254 (prior session): District/Upazila checkout selection + weight-based Inside Dhaka/
Outside Dhaka shipping rates. Built as a UI/data layer resolving DOWN
into the existing ShippingZone/ShippingArea/Cart.shippingAreaId
pipeline — no Cart/Order schema or checkout-submission changes beyond
threading one new totalWeightGrams number through. New District/Upazila
models (migration 20260908181707_district_upazila_weight_shipping),
seeded with all 64 real Bangladesh districts + 486 upazilas
(lib/shipping/bd-districts-seed.ts, scripts/shipping/seed-districts.ts —
best-effort data, not verified against an official source). ShippingZone
gained baseWeightGrams/baseRateAmount/extraRatePerKgAmount; new formula
in lib/cart/shipping.ts: baseRateAmount + ceil(extra grams / 1000) *
extraRatePerKgAmount. New Admin → Shipping → Shipping Rates page lets
the operator set each zone's rate with a live preview. Product gained
weightGrams (default 500g — per-product editing not yet in
admin-product-form.tsx, a disclosed follow-up).

Found and fixed a real bug during verification: listPublicUpazilas()
returned the raw ShippingArea cuid, but the rest of the pipeline
(listPublicShippingAreas, cart, checkout, order creation) uses a
different composite id (`${zoneCode}::${areaName}`) — the mismatch would
have made every District/Upazila selection at checkout fail to resolve
a shipping rate. Fixed by joining through Upazila.shippingArea and
building the same composite id. Verified end-to-end with a temporary
script (deleted after use) using real seeded data and temporary zone
rates, then reset those test rates back to 0/0 so no invented prices
are left live. Also carried the AD-253 Order.carrierId FK fix forward
(see prior entry). `tsc --noEmit` clean, `npm run test:payments` 47/47.

Disclosed, not silently skipped: per-product weight UI is a follow-up;
the seeded upazila list should be spot-checked; all 3 ShippingMethod
rows are currently isActive=false (pre-existing, untouched, out of
scope) so checkout shows zero shipping method options until the
operator re-activates at least one.

AD-253 (prior session): Real "Send to Pathao"/"Send to Steadfast" courier booking on
Admin → Orders — a WordPress/WooCommerce-style per-row button, the
operator's explicit request. New CourierSetting model (mirrors
PaymentGatewaySetting), its own COURIER_SECRETS_KEY (separate from
GATEWAY_SECRETS_KEY/STORAGE_SECRETS_KEY per the established per-domain-
key convention), real HTTP clients for both couriers, and an
orchestration layer that always re-fetches the order server-side
(never trusts client-supplied customer PII) and refuses to send an
order that already has a carrierId (blocks accidental double-booking
with a real courier — that can't be undone). Reused the Order model's
existing `carrierId` column, which was defined in the schema but never
actually written anywhere (only `trackingCode` was, via manual staff
entry) — now both get set for real, so the public /track page picks it
up with zero changes needed there.

Confidence differs sharply between the two: **Steadfast** is high
confidence — base URL, auth headers, and field names were independently
corroborated today across Steadfast's own WordPress plugin listing and
multiple current guides. **Pathao** is lower confidence — their official
docs sit behind a merchant-login portal that couldn't be reached, so
the base URLs, "aladdin" endpoint paths, and delivery_type/item_type
numeric codes are best-effort general knowledge, not reconfirmed live
today (field names for order creation ARE corroborated). Flagged
clearly in code comments. Pathao also structurally needs a recipient
city/zone/area from Pathao's own lookup lists (our orders only store
free-text addresses) — asked the operator how to handle this rather
than guessing; they chose a live picker, so "Send to Pathao" opens a
modal that fetches Pathao's real city → zone → area lists (cascading)
before submitting.

Also fixed along the way: the Pathao/Steadfast credential cards on
/admin/shipping were themselves still mock (local-state-only, fake
"(mock)" toast) — now real encrypted save/load, same shape as the
payment gateway credentials screen.

`tsc --noEmit` clean, `npm run test:payments` 47/47, dev server
restarted and all touched routes verified live. Operator explicitly
acknowledged this needs real-account testing before trusting it live
("amra pore test korbo eta") — same posture as Nagad (AD-241).

AD-252 (prior session): Shipping section audit + consolidation, per the operator sharing
a screenshot of all 8 sidebar items and asking to make the whole section
dynamic. Found the real system is just Method + Zone + Area (confirmed
in lib/shipping/resolve.ts — checkout always resolves through these
three, nothing else); those 3 pages were already fully DB-backed. The
other 5 pages (Configuration, Countries, States, Cities, Carriers) were
mock, but making them "dynamic" honestly wasn't possible without either
persisting data with zero real effect (the anti-pattern avoided all
session) or actually building new pricing-calculation modes (a much
bigger change). Presented this clearly and asked rather than guessing;
operator chose consolidation over persisting-with-caveats or building
real alternate pricing modes. Countries/States/Cities/Carriers removed
from lib/admin/nav.ts and their routes now redirect to the real
equivalent (Countries/States → Zones, Cities → Areas, Carriers →
Methods) instead of 404ing old links. Deleted the now-fully-orphaned
admin-shipping-location-list.tsx and its 4 MOCK_SHIPPING_* arrays.
Shipping Configuration rewritten from a fake mode-switcher into a real
two-card hub linking to Methods and Zones/Areas. `tsc --noEmit` clean,
`npm run test:payments` 47/47, all 8 routes verified live (no 404/500;
internal redirect targets not directly curl-testable behind the admin
login gate, but the `redirect()` code is standard and identical in
shape across all 4 converted pages).

AD-251 (prior session): Added a real Messenger floating button (m.me/<page id>, inline
SVG glyph, same shape as AD-250's WhatsApp button) and stacked it with
WhatsApp in one fixed bottom-right container in
components/chat/storefront-chat-widget.tsx — each icon renders only when
its own provider is enabled, independent of the others; Tawk.to keeps
rendering via its own official script alongside them, unchanged.
Extended getStorefrontChatWidgetTag() to also resolve messengerPageId.
Verified live: temporarily enabled a real Messenger row alongside the
operator's real WhatsApp one and confirmed both wa.me/8801829317005 and
m.me/technohousetest appeared together in the homepage HTML, then
reverted the Messenger test row and confirmed only WhatsApp remained.
All three chat channels (Tawk.to, WhatsApp, Messenger) are now
genuinely live on the storefront, each independently toggleable from
/admin/settings/chat.

AD-250 (prior session): Added a real floating WhatsApp button after the operator reported
a saved number "not showing." First checked the DB directly rather than
assuming — the save had worked fine (enabled, handle "01829317005"); the
actual gap was that WhatsApp, like Messenger, never got real storefront
UI (only Tawk.to did, in AD-249). Extended
getStorefrontChatWidgetTag() to also resolve and normalize the WhatsApp
number (BD local "01..." → international "880..." digits wa.me needs),
and storefront-chat-widget.tsx now renders a fixed bottom-right wa.me
link with an inline SVG WhatsApp glyph (no new icon dependency) whenever
enabled. Verified against the live dev server that the operator's actual
saved number renders correctly as wa.me/8801829317005 in the homepage
HTML. Messenger intentionally still has no storefront button (not asked
for this round).

AD-249 (prior session): Added a real Tawk.to live chat widget, per explicit operator
request ("add the tawk.to system too") rather than the usual
persist-config-only pattern — this one genuinely renders on the
storefront. New TAWKTO value on ChatWidgetProvider; the admin handle
field stores `<property id>/<widget id>` (matches Tawk's own embed URL
shape); a new components/chat/storefront-chat-widget.tsx injects Tawk's
real official embed script via next/script, added to the storefront
layout right next to the existing StorefrontAnalytics component (GA4/
GTM/Meta Pixel) — same proven live-script pattern, not a new one.
Verified by temporarily enabling a real DB row and confirming
`embed.tawk.to/<ids>` actually appears in the rendered homepage HTML,
then disabling it and confirming it disappears; no test data left
behind. WhatsApp/Messenger on the same page remain persisted-intent-only
(not asked for). Also confirmed, no changes needed, while sweeping
Setup & Configurations one page at a time: /admin/settings/social,
/google/recaptcha, /google/map, /google/firebase were all already fully
dynamic before this session even started.

AD-248 (prior session): /admin/settings/social was already fully dynamic — checked, no
changes needed (real DB save, "live OAuth deferred" is honest and
correctly scoped). /admin/settings/filesystem was fully mock across all
4 sections; asked the operator first since actually switching storage/
cache backends is separate, larger, higher-risk work (confirmed no S3/
Redis client exists anywhere; uploads always write to local disk) —
operator chose persist-only, same choice as AD-246. New
`FilesystemSettings` model, secrets (S3 key, Backblaze key, Redis
password) encrypted via a new `lib/storage/secret-crypto.ts` scoped to
its own `STORAGE_SECRETS_KEY` (deliberately separate from
GATEWAY_SECRETS_KEY — don't share encryption keys across unrelated
secret domains). UI states plainly that uploads still go to local disk
regardless of these settings. `tsc --noEmit` clean, `npm run
test:payments` 47/47, dev server restarted and both pages verified live.

AD-247 (prior session): Fixed /admin/smtp "Send test email". Its config save
(saveSmtpConfigAction) was already DB-backed, but the test button still
said mail delivery was deferred — AD-239 built real outbound email
(lib/mail/send.ts) for Contacts replies but never touched this separate
SMTP settings page. Added sendTestEmailAction (smtp.manage-gated,
mirrors AD-240's OTP test-send) and updated stale "not live yet" copy.
Worth noting for future admin-nav sweeps: pages that reuse the same
underlying lib (SMTP config, in this case) can still have independent
mock buttons that a fix elsewhere doesn't reach — check each page that
touches shared infra, not just the one that prompted the original fix.

AD-244/245/246 (same session): Wired /admin/settings/currency, /languages, and /features
to real PostgreSQL settings, done phase by phase per the operator's
request. Currency: new SiteSettings currencyDecimalPlaces/
currencySymbolPosition fields — the multi-currency table stays
intentionally locked (BDT-only is AD-006, not mock debt); the format
preference doesn't yet feed formatMoney() sitewide (that would mean
threading it through dozens of client call sites — out of scope, stated
in the UI). Languages: new LanguageSetting model — default language and
per-row enabled/RTL now persist for real; "Add language"/"Import
Translations"/View/Edit changed from fake-success toasts to honest
"isn't available yet" since there's no translation content model or i18n
routing to back them. Features: new FeatureFlagSetting model (19 flags,
4 sections) — asked the operator first since this phase was materially
bigger/more ambiguous than the other two (confirmed via grep that zero
existing code reads any of these 19 flags); operator chose
persist-only, no live enforcement. Added `disabled` support to
AdminToggleSwitch/AdminToggleRow (didn't exist before, needed for
Languages). All three: `tsc --noEmit` clean, `npm run test:payments`
47/47, dev server restarted after each phase and every touched route
verified 200/307 on the real running server (not `npm run build`, per
the dev/build conflict noted below).

AD-243 (prior session): Wired /admin/payments/offline and /admin/payments/emi (both were
local-state-only mock forms) to real PostgreSQL settings: new
OfflinePaymentSettings / EmiSettings singleton models,
lib/payments/offline-config.ts + emi-config.ts, and a permission-gated
action file. Checkout now shows the real COD label/instructions and
hides COD when disabled (enforced server-side in
preparePaymentStart, not just the UI). The PDP EMI teaser now reflects
real enabled/tenure/partner/minimum-order config instead of always
showing hardcoded "display only" copy with a fake "View plans" button.
While fixing this, hit the same client/server Prisma-leak bug shape a
5th time (admin-emi-settings.tsx value-importing EMI_TENURE_OPTIONS from
a Prisma-touching file) — moved the constant into a new
lib/payments/emi-shared.ts. Also discovered `prisma migrate dev` had
silently not run `prisma generate` for the new models; fixed by running
it explicitly. Verified via `tsc --noEmit` (clean), `npm run
test:payments` (47/47), and manually hitting every touched route on a
restarted dev server — did NOT use `npm run build` for final
verification since the user had their own `npm run dev` live and running
build concurrently corrupts `.next/dev/types` (confirmed mid-task; see
Pending Decisions).

AD-242 (same session): Verified bKash and SSLCommerz against their official API docs
(developer.bka.sh, developer.sslcommerz.com) — the user asked for this
explicitly after the Nagad work, to check whether the "already real" bKash/
SSLCommerz code actually matched the gateways' real specs. Found and fixed
genuine bugs: bKash Create Payment was hitting the mode-0001
agreement/recurring path (`/tokenized/checkout/create`, needs an
agreementID never sent) instead of the mode-0011 one-time path
(`/tokenized/checkout/payment/create`) — this alone likely broke bKash
checkout against a real account. bKash Execute Payment needs paymentID as
a URL path segment, not a JSON body field. bKash Refund was on the wrong
path/API version with wrong field casing (`refundTrxID` vs real
`refundTrxId`) — refunds could never have worked even if the call
succeeded. SSLCommerz's session-create and IPN-validate matched the docs
exactly; only its refund field name (`refe_id` → `refund_trans_id`) was
wrong. Full detail in docs/PAYMENT_SECURITY.md and TASKS.md AD-242.
`npm run test:payments` (47 checks) and `npm run build` pass, but none of
this is testable against live bKash/SSLCommerz sandboxes in this
environment — run one real sandbox transaction per gateway before trusting
this live.

AD-241 (same session): Nagad wired into real checkout. bKash and SSLCommerz were already
fully real (hosted session, callback verification, refunds) — Nagad had
encrypted admin credentials (RSA public/private keys) but no checkout
adapter at all, not even selectable. Added lib/payments/nagad-crypto.ts
(RSA encrypt/sign/decrypt via Node's built-in crypto, no new dependency,
mirroring Nagad's own PHP openssl_* samples) and lib/payments/nagad.ts
(initialize → complete → verify, matching the bKash/SSLCommerz adapter
shape exactly). Nagad now flows through the same generic
PaymentProviderId/PaymentMethodId/HostedGatewayId plumbing everything
else already used, plus a new callback route. `npm run test:payments`
(47 checks) and `npm run build` both pass. Nagad's exact field names,
endpoints, and headers are best-effort from public integration guides —
genuinely untested against a live Nagad sandbox, so verify carefully
before going live. Nagad refunds are intentionally not automated (no
confirmed public refund API); they already fall through to "cannot be
refunded here", same as any other unsupported provider.

AD-240 (same session): Admin → OTP "Send test OTP" now sends a real SMS. Config save was
already DB-wired; the test button always said delivery was deferred.
Added lib/sms/send.ts with per-provider HTTP calls (ssl-wireless,
mim-sms, twilio, messagebird — local-mock intentionally never sends),
reading SMS_API_KEY/SMS_API_SECRET (never stored in DB, mapping differs
per provider). Twilio/MessageBird follow stable public REST APIs;
SSL Wireless/Mim SMS shapes are best-effort from public docs, not
verified against a live account. Scope explicitly excludes the real
login/registration OTP generate/verify flow (auth-security-critical) —
operator chose to defer that; the toggles still only store intent.

AD-239 (same session): Admin → Contacts replies now send real email. /admin/contacts was
already fully DB-wired (AD-224); the gap was that a staff "Reply" only
saved to `Complaint.reply` — nothing reached the customer. Added the
app's first outbound-mail capability: `nodemailer` + lib/mail/send.ts
(`sendMail`/`sendMailSafe`), reading the saved SmtpConfiguration plus the
`SMTP_PASSWORD` env var (never stored in DB). `updateAdminContact` now
emails the customer when the reply text is new, and surfaces a
non-fatal "Saved, but the email did not send: …" warning if SMTP isn't
configured — the DB save always succeeds regardless. Needs the operator
to set SMTP_PASSWORD and real settings in Admin → Setup → SMTP to
actually deliver; not testable against a live mail server in this
environment.

AD-238 (same session): wired /admin/support/conversations ("Product
Conversations") to real
data. It was a fully mock duplicate of the already-DB-backed
/admin/questions (ProductQuestion) screen — same underlying data, static
rows, and a "View" button that only toasted. Now loads
`loadAdminQuestionList()`, shows a live Answered/Awaiting-reply status,
and its View button links to the existing real /admin/questions/[id]
answer page rather than duplicating a second Q&A system. Removed the
dead `MOCK_PRODUCT_CONVERSATIONS` / `ProductConversation` mock export.

AD-237 (same session): wired /admin/support/[id] staff replies and
status/priority saves to PostgreSQL. The admin ticket list/detail reads
were already DB-backed (`lib/admin/load-support.ts`), but the reply form
and status/priority save button only toasted locally ("Mock ticket
thread") — a staff reply never reached the customer. Added
`replyAdminTicket` / `updateAdminTicketStatus` to lib/admin/load-support.ts
and a permission-gated (tickets.reply / tickets.manage) "use server"
action file at features/admin/support/ticket-actions.ts. A staff reply
now creates a real `SupportMessage`, appears immediately on the
customer's /account/tickets/[id] thread, and creates an in-app
`Notification` for that customer.

Also AD-235/AD-236 from the prior session: fixed a `next build`-breaking
client/server Prisma leak in the admin Staff and Customers list pages
(extracted into lib/admin/staff-list-shared.ts and
lib/admin/customer-list-params.ts, matching the existing
*-list-params.ts convention), and wired /admin/refunds/reasons to
listAdminRefundReasons (was missing its initialReasons prop). `npm run
build` now compiles and type-checks cleanly; static generation can still
hit "too many database connections" against a local Postgres under
default max_connections — a local infra tuning matter, left alone per
operator decision, not a code defect.

## Storefront Palette (current — AD-306, AD-315)

Every storefront colour routes through the `@theme` block in
`app/globals.css`. No storefront component hard-codes a brand hex, so a
palette change is a single-file edit. Keep it that way.

| token | value | note |
| --- | --- | --- |
| `--color-primary` | `#0b5ed7` | 5.84:1 on white both as link text and as white-on-filled |
| `--color-primary-hover` | `#0947a8` | |
| `--color-primary-bright` | `#0a6cff` | **accents on dark panels only** — plain `primary` is 2.92:1 there, under the 3:1 graphical floor |
| `--color-primary-soft` | `#e8f0fe` | true tint; primary on it is 5.1:1 |
| `--color-secondary` | `#051c39` | dark panel ground |
| `--color-text` | `#051c39` | 17.05:1 on white |
| `--color-text-muted` | `#59637a` | 6.02:1 on white |
| `--color-background` / `--color-surface-muted` / `--color-border` | `#f4f7fb` / `#eef2f9` / `#d6deea` | |
| `--color-info` | `#0f766e` | teal — moved off `#0369a1`, which was near-identical to the new primary |

The copper/orange accent (`#b8612c`) is **gone** — it measured 4.39:1 on
white, quietly failing AA. Any older paragraph in this file describing
copper is a historical record of that task, not current state.

The admin still runs its own blue (`#3897f0`, 377 literals across 97
files, zero in storefront). Harmonising it is an open, unapproved task.

## Currently Working On
Idle. Manual testing support.

## Pending Decisions
- PC Builder Overview settings (AD-275) are real but persist-only, by
  explicit operator choice — the live storefront builder still shows
  every slot regardless of the admin toggles. If ever made to apply
  live, the real integration points are: `lib/domain/pc-builder/
  slots.ts` (`BUILDER_SLOTS`, currently pure/sync, imported directly by
  `pc-builder-slot-list.tsx`, `pc-builder-select-sidebar.tsx`, and
  `app/(storefront)/pc-builder/select/[slot]/page.tsx`) would need an
  async DB-driven filter layered in at those specific render points —
  NOT a conversion of the pure domain module itself, which several
  other files (compatibility engine, cart conversion, sharing) depend
  on staying synchronous. `lib/pc-builder/settings.ts` already has the
  real enabled/required data ready to read whenever that's wanted.
- Bulk import/export (AD-274) deliberately does not cover variants,
  colors, attributes, or spec groups — flat CSV rows only, disclosed in
  the import page's own instructions. If ever built, it would need a
  multi-row-per-product or JSON-in-cell scheme, a materially bigger
  design than the current one-row-per-product model. `weightGrams` is
  now real end-to-end in `saveAdminProduct`/`parseProductInput` (closed
  during AD-274) but the single-product admin form
  (`admin-product-form.tsx`) still has no UI input for it — only bulk
  CSV and direct API calls can set it today; adding the form field is a
  small, separate follow-up. Bulk import caps at 1,000 rows per file,
  export at 10,000 rows — both documented constants in
  `lib/catalog/bulk-csv.ts`, generous for a single-vendor catalog but
  revisit if the real catalog ever approaches those sizes.
- Design Studio (AD-272/273) is fully done — all 8 sub-pages real.
  **Pages (CMS)** doesn't support creating brand-new pages, only editing
  the 8 fixed existing ones — Next.js needs a real route file per page
  and there's no dynamic `[slug]` catch-all; building true arbitrary
  page creation would be a separate, bigger routing-architecture task.
  `/contact`'s CMS content is static info only (address/hours/etc.) — no
  real interactive contact form exists anywhere in this codebase; that
  would be a distinct, not-yet-requested feature. **Watermark** settings
  (Appearance page) save for real but automatic watermarking on upload
  is NOT implemented — disclosed in the UI; if built later, decide which
  upload flows it applies to (all `uploadAdminMediaFiles` calls, or just
  product images) before wiring real image processing. **Admin navbar
  text color** only drives the highest-visibility text (wordmark, active
  states) — hover/muted micro-states in `admin-sidebar.tsx` stay literal
  white by deliberate scope choice, not an oversight; revisit only if
  the operator specifically asks for full navbar text theming.
- Report Center (AD-270) is fully done — all 7 pages. **Wishlist** and
  **Compare** reports are deliberately left showing an honest "not
  available yet" state, by operator decision — real data would require
  syncing the currently-localStorage-only storefront wishlist/compare to
  the database first (the unused `Wishlist`/`CompareList` models already
  exist in schema), which is a storefront feature change bigger than a
  report fix. Revisit only if the operator wants real account-synced
  wishlist/compare as its own task. The **Wallet Adjustment Ledger**
  only records admin-initiated balance adjustments (there is still no
  real customer-facing wallet top-up flow) — if the operator ever builds
  one, wire it to write into the same `WalletTransaction` model rather
  than inventing a second history mechanism. **User Searches** logs
  every real search unconditionally (no per-session/per-visitor
  deduplication) — a disclosed simplification, not a bug; revisit if
  the operator wants "unique searchers" instead of raw search-event
  counts.
- Custom Scripts (AD-269) is Admin-role-only by explicit operator
  choice (`custom_scripts.manage`/`.view`) — Manager/Support cannot see
  or edit it even though they can manage other Marketing Analytics
  settings. If a future role needs it, grant it explicitly rather than
  bundling it into a broader permission. Content is genuinely
  unsanitized by design; anyone granted `custom_scripts.manage` can run
  arbitrary JS for every storefront visitor — treat granting this
  permission with the same care as `staff.add`/`smtp.manage`.
- Meta CAPI (AD-268) needs a real `META_CAPI_ACCESS_TOKEN` (Events
  Manager → Settings → Conversions API) set in production before any
  real Purchase event actually reaches Meta — currently unset in dev,
  verified to fail closed honestly. Purchase fires on every order
  placed regardless of payment method/status (not gated on payment
  confirmation) — revisit if the operator wants it gated on PAID only.
  InitiateCheckout/ViewContent CAPI events were not built (Purchase
  only, the highest-value one) — add later if wanted.
- Structured data (JSON-LD, AD-262) exists only on blog posts now — the
  rest of the site (product pages, category pages, home) has none.
  Worth a dedicated pass if the operator wants richer product-page SEO
  (Product/Offer schema) later; not done here since only blog was asked.
- The entire AD-258 Marketing audit is now closed (AD-258 through
  AD-266) — Bulk SMS was the last item. A real SMS/SMTP provider still
  needs configuring in Admin → OTP / Admin → Setup → SMTP before any
  real campaign actually delivers (both currently fail closed honestly
  in this dev environment, verified, not a bug) — and real per-message
  SMS cost applies once a real provider is live.
- Email Templates (AD-261) are real content but not yet wired to
  automatic order-lifecycle sends (same gap as Notification Types) — no
  code creates an email keyed to one of these today. Wiring the ~8 real
  trigger points (order placed/confirmed/shipped/delivered/etc.) is a
  separate, larger task touching order-processing code.
- Newsletter campaign send (AD-261) requires real `SMTP_PASSWORD` +
  Admin → Setup → SMTP configuration to actually deliver — currently
  unset in this dev environment, so any real send attempt fails closed
  with an honest per-recipient failure count (verified, not a bug).
- Custom Sale Alert (AD-260) and Custom Alert (AD-259) storefront
  widgets can visually stack if both are enabled and Custom Alert is set
  to bottom-left — no cross-widget position coordinator exists. Low
  priority; revisit if it comes up in practice.
- Standard procedure going forward: after any Prisma migration +
  `prisma generate` in this project, restart the dev server before
  testing — the running process keeps its old client in memory and
  throws `Cannot read properties of undefined (reading 'findMany')` on
  any new model until restarted. Bit twice now (AD-258 Popups, surfaced
  live between sessions); do this proactively every time, not just when
  reminded.
- Notification Types (AD-258) is real CRUD but not yet wired to
  automatic triggers — no order-lifecycle event (placed/confirmed/
  shipped/etc.) creates a real Notification today. Wiring that up is a
  separate, larger task if wanted.
- `lib/admin/engagement-mock.ts`'s `MOCK_DYNAMIC_POPUPS`/`MOCK_POPUPS`
  exports are now fully dead (AD-258 moved Popups to real data) but were
  left in place since the file still backs 4 other still-mock pages.
- B2B wholesale discount (AD-257) only applies on the PDP display, not
  cart/checkout totals — operator's explicit choice to keep it out of
  the order-pricing path for now. Revisit if real wholesale orders need
  the discount to actually apply at checkout.
- B2B applicants aren't emailed on approval/suspension (no notification
  wired) — they'd need to revisit the PDP to see their status change.
  Could reuse the existing lib/mail/send.ts if wanted later.
- Customer impersonation ("Log in as this customer", AD-256): removed
  rather than built. If wanted later, needs a dedicated audited
  staff-initiated session mechanism — not a simple field update.
- Wallet recharge (AD-256) is a direct balance adjustment with no
  queryable transaction history (operator's explicit choice over
  building a new ledger table) — Reports → Wallet Recharge History
  remains unrelated/still mock.
- Staff list (AD-255) still has no status column/filter in the UI (the
  data supports it; just never asked for) — add if the operator wants
  to see/filter Active vs Invited vs Disabled from the list view.
- Set real Inside Dhaka / Outside Dhaka rates in Admin → Shipping →
  Shipping Rates (AD-254) — both zones currently sit at the unconfigured
  default (0 base rate). Spot-check the seeded 64-district/486-upazila
  list (best-effort data) and fix any missing/misspelled upazila.
- Per-product shipping weight isn't editable via Admin → Products yet
  (AD-254) — every product defaults to 500g until that form is wired up.
- All 3 ShippingMethod rows are currently isActive=false (observed, not
  caused, during AD-254) — checkout will show no shipping method options
  until at least one is re-activated in Admin → Shipping → Select
  Shipping Method.
- Related-product merchandising order: the link table still has no `position`,
  so `relatedSlugs` come back in catalogue order.
- Prisma 8 upgrade once it leaves RC — it needs Node ≥ 22.18 (this machine has 22.17).
- Exact production deployment topology and managed PostgreSQL provider (Phase 18).
- Live merchant credentials via admin (sandbox toggle) + public APP_URL.
- Before go-live: run one real sandbox transaction (create → execute →
  refund) for each of bKash, SSLCommerz, and Nagad. bKash/SSLCommerz code
  now matches their official docs (AD-242) but is untested against a live
  sandbox; Nagad (AD-241) is additionally best-effort on the RSA request
  shape itself, not just untested.
- Before trusting "Send to Pathao"/"Send to Steadfast" live (AD-253): set
  COURIER_SECRETS_KEY, enter real credentials in Admin → Shipping →
  Select Shipping Method, and send one real test order per courier.
  Pathao specifically needs its base URL/endpoint paths confirmed
  against the operator's own Pathao merchant dashboard — those were
  best-effort (docs are behind a merchant login).
- Real social profile URLs for footer icons — set in Design Studio → Footer widgets (AD-230).
- Real category videos when available (not demo embeds).
- Whether to restore a non-floating support entry later (support routes remain).
- Operational: never run `npm run build` (or a bare `tsc --noEmit`, which
  includes `.next/dev/types` by default) while `npm run dev` is running —
  both write to `.next` and a concurrent run corrupts
  `.next/dev/types/routes.d.ts`, producing spurious TypeScript errors
  unrelated to any real code change. If that happens, restart the dev
  server (regenerates cleanly) rather than debugging the false errors.
  Also: after a Prisma schema change, confirm `npx prisma generate`
  actually ran (check the new model appears under
  `lib/generated/prisma`) — `prisma migrate dev` is supposed to run it
  automatically but didn't reliably do so once this session.
- Next.js middleware → proxy migration (Next 16 deprecation warning).
- Finish retiring remaining admin mock screens (marketing engagement chrome,
  design studio persistence, B2B, reports, etc.).
- Nagad checkout (AD-241): now wired end-to-end, but the RSA request/
  response field names, endpoints, and headers are best-effort from
  public docs — test thoroughly against Nagad's real sandbox
  (initialize/complete/callback/verify) before enabling it live.
- UI-T04 remaining: account chrome (cart/checkout done in AD-205).
- Production: set a unique `ADMIN_LOGIN_SLUG` (do not keep `th-ops-local`).
- SMTP email (AD-239): operator confirmed real delivery will be tested
  after deployment, not locally — set `SMTP_PASSWORD` + real host/port/
  from in Admin → Setup → SMTP against production, then send a test
  Contacts reply to confirm it lands.
- SMS test-send (AD-240): needs `SMS_API_KEY`/`SMS_API_SECRET` + a real
  provider selected in Admin → OTP to verify delivery — SSL Wireless and
  Mim SMS request shapes are best-effort and unverified against a live
  account, so test those two providers first if either is the target.
- Real login/registration OTP flow (generate/verify codes) intentionally
  not built — operator scoped AD-240 to test-send only, since the full
  flow is auth-security-critical and a materially larger change.

## Next Approved Task
None. Do not start Phase 18. Continue mock retirement only if operator asks.

## Last Updated
2026-10-07 (AD-367 — admin saves no longer crash with the global error page (my AD-364 toast
bug); full-site check; AD-366 — a pale saved "Button hover" colour no longer blanks button text;
AD-365 — PC Builder buttons no longer jump; AD-364 — storefront jump-up animation on buttons, icons, add to cart
and alerts (storefront only); AD-363 — product Review and Q&A usable without signing in (guest
rows stay PENDING until staff approve); AD-362 — Add to cart beside the product image; AD-361 product page in
the Ryans structure; AD-359 compare search before a type is chosen; AD-358
searchable compare picker; AD-357 homepage sections chosen by staff. AD-344 to
AD-367 are recorded in TASKS.md only.)
