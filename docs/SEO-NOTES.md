# SEO Notes — technohouse.com.bd

Working notes for the SEO fix plan in `docs/SEO-FIX-PLAN.md` (section 6 is
the task list, section 4 is the "never do" list). Branch: `seo-fixes`.

## 1. Codebase map (written before any change)

| Concern | Where |
|---|---|
| Framework | Next.js 16.3.3 App Router, React server components, Prisma (PostgreSQL) |
| Root layout | `app/layout.tsx` — sets `metadataBase` from `publicOrigin()` (= `APP_URL`, live: `https://technohouse.com.bd`), Google verification meta, literal Facebook domain-verification `<meta>` in `<head>` |
| Storefront layout | `app/(storefront)/layout.tsx` — `generateMetadata` (site title/description/keywords from the `SEOConfiguration` row, openGraph/twitter defaults, favicon), renders `SiteJsonLd`, header/footer/mega-menu |
| Admin layout | `app/(admin)/…` (noindex; blocked in robots) |
| Global loading / 404 | `app/loading.tsx` (skeleton; **was** a Suspense boundary over every route — see Phase 1.2), `app/not-found.tsx`, `app/(storefront)/blog/not-found.tsx`, `app/(storefront)/track/[orderNumber]/not-found.tsx` |
| Middleware | `middleware.ts` (Node runtime) — admin/account/b2b auth gates, wrong-case URL 308 (AD-369) |
| Canonical helper | `lib/seo/canonical.ts` → `canonicalUrl(path)` = `publicOrigin() + path` |
| Public origin | `lib/seo/public-origin.ts` (`APP_URL`, fallback `http://127.0.0.1:3000`) |
| Home metadata | `app/(storefront)/page.tsx` (global SEO row + canonical `/`) |
| Product metadata | `app/(storefront)/product/[slug]/page.tsx` `generateMetadata` (title `{name} — Techno House`, description = first overview line, canonical, OG image) |
| Category metadata | `app/(storefront)/category/[slug]/page.tsx` + copy from `lib/catalog/category-page-content.ts` (`getCategoryPageContent`) |
| Brand metadata | `app/(storefront)/brand/[slug]/page.tsx` (`{brand} — Techno House`, brand description) |
| Static content pages | about, contact, faq, support, warranty, shipping, returns, terms, privacy, digital-commerce-guideline → `features/content/storefront-content-page.tsx` `storefrontContentMetadata()` (meta title/description from the `ContentPage` DB row, editable in admin) |
| Other static pages | brands, deals, offers, offers/[slug], flash-sale, pc-builder, blog, complaint, product-request, track, shop — each has its own `metadata`/`generateMetadata` in `app/(storefront)/<page>/page.tsx` |
| Non-indexable pages | account/*, b2b/*, cart, checkout/*, compare, search, wishlist, pc-builder/share/[id], track/[orderNumber] — `robots: NO_INDEX` (`lib/seo/robots.ts`) and/or robots.txt Disallow |
| JSON-LD builders | `lib/seo/json-ld.ts` (`organizationJsonLd`, `websiteJsonLd`, `breadcrumbListJsonLd`, `productJsonLd`), serializer `lib/seo/serialize-json-ld.ts` |
| JSON-LD render | `components/seo/json-ld-script.tsx` (`<JsonLd>`), `components/seo/site-json-ld.tsx` (Organization + WebSite, in storefront layout); used by product page, `features/catalog/category-listing.tsx`, `features/catalog/brand-listing.tsx`, `app/(storefront)/blog/[slug]/page.tsx` |
| Images | `next/image` in ~25 files with a **custom loader** `lib/image-loader.ts` (`/uploads/*` and `.svg` bypass the optimizer because nginx serves `/uploads` from disk). Raw `<img>` still in storefront: blog list/post, `components/layout/{site-header,site-footer,header-search}.tsx`, `components/storefront/{dynamic-popup,site-alert}.tsx`, `features/product/{product-gallery,product-image-lightbox}.tsx`, `features/account/account-order-detail-view.tsx`, `components/analytics/storefront-analytics.tsx` (pixel noscript) |
| Sitemap | was `app/sitemap.ts` (single urlset) built from `lib/seo/sitemap.ts` `listSitemapEntries()`; admin summary at `app/(admin)/admin/(panel)/sitemap/page.tsx` |
| Robots | `app/robots.ts` — allows `/`, disallows admin/account/b2b/dev/checkout/cart/wishlist/compare/search; does **not** block `/_next/` or `/uploads/`; `Sitemap: https://technohouse.com.bd/sitemap.xml` |
| Catalogue data | PostgreSQL via Prisma (`prisma/schema.prisma`), accessed through `lib/data` repositories (`lib/data/prisma/*-repository.ts`). `getBySlug` for product/category/brand = `slug` + `isActive: true`. Blog: `lib/content/blog.ts` (`status: PUBLISHED`). Content pages: `ContentPage` table |
| Feeds | `app/feeds/*` + `lib/analytics/feeds.ts` (Google/Facebook catalogue XML) |
| SEO guard script | `scripts/seo/check-baseline.ts` (`npm run test:seo`) — static source checks |
| nginx | **In the repo**: `deploy/nginx-techno-house.conf` (template with `example.com`). The live server's config differs from it — live answers HTTP/1.1 only (the repo file has `http2`), so the live file was edited/managed separately (likely certbot). |

### Live behaviour observed before changes (2026-11-09, curl)

- `https://www.technohouse.com.bd/warranty` → **200** (www served as a duplicate site).
- `http://technohouse.com.bd/warranty` → 301 → `https://technohouse.com.bd/warranty` (fine).
- `http://www.technohouse.com.bd/warranty` → 301 → `https://www.…` (stays on www).
- `/product/does-not-exist-xyz`, `/category/does-not-exist-xyz` → **200** + `<meta name="robots" content="noindex">`, even with a Googlebot UA.
- robots.txt and sitemap URLs already use `https://technohouse.com.bd` (APP_URL is correct on the server). Server header `nginx/1.24.0` → not proxied through Cloudflare.

## 2. Changes

### Phase 1 — Indexing & duplicates

See the commit `SEO phase 1: …` on branch `seo-fixes`.

1. **www / http → https apex (301).**
   - `middleware.ts`: new host check at the top. Runs only when the request
     host starts with `www.` or `X-Forwarded-Proto: http` (matcher `has`
     conditions, so ordinary requests do not run it). Redirects only when the
     host is exactly the `APP_URL` host or `www.` + it — localhost/IP/other
     hosts are never touched. 301 for GET/HEAD, 308 for other methods (keeps
     a POST body). Path and query string are preserved.
   - `deploy/nginx-techno-house.conf`: port 80 now sends everything straight
     to `https://example.com$request_uri` (one hop, not via www); a separate
     443 server block for `www.example.com` returns 301 to the apex.
   - `deploy/nginx-seo.conf`: the same blocks with the real domain, for
     pasting into the live config (which differs from the repo template).
2. **Real 404 for missing product/category/brand.** The pages already
   called `notFound()`, but the root `app/loading.tsx` Suspense boundary made
   Next flush a 200 header before the page ran, so missing records were
   "200 + noindex". Fixes:
   - Removed `app/loading.tsx` (no Suspense boundary above the detail
     pages any more → status 404 for every user agent).
   - Re-added the same skeleton only where no 404 is possible:
     `app/(storefront)/{shop,search,deals,flash-sale}/loading.tsx` and
     `app/(admin)/loading.tsx` (admin keeps its old loading behaviour).
   - `generateMetadata` on product/category/brand (and offers/[slug]) now
     calls `notFound()` too, so even if a loading boundary is added again
     later, crawlers that get blocking metadata (Googlebot, Bingbot —
     `htmlLimitedBots`) still get a 404 status.
   - `scripts/seo/check-baseline.ts` (`npm run test:seo`) now fails if a
     `loading.tsx` reappears at the app root / storefront root / above
     product, category, brand, offers or blog pages.
   - Trade-off: client-side navigation to a product/category/brand page no
     longer shows the skeleton instantly; the old page stays until the new one
     is ready (as on any page without `loading.tsx`).
3. **Self-canonical on every indexable page.** `metadataBase` was already set.
   Added canonicals to: about, contact, faq, support, warranty, shipping,
   returns, terms, privacy, digital-commerce-guideline (via
   `storefrontContentMetadata`), brands, deals, offers, offers/[slug],
   flash-sale, pc-builder, complaint, product-request, track (blog, home,
   shop, product, category, brand already had one).
4. **Pagination canonical.** New `listingCanonicalUrl(path, searchParams)` in
   `lib/seo/canonical.ts`: `?page=N` (N>1) and nothing else → canonical
   `path?page=N`; any filter/sort/pageSize/q param present → canonical to the
   clean path (unchanged behaviour); page 1 → clean path. Used by category,
   brand, shop, deals and offers/[slug].
5. **Sitemap index.** `app/sitemap.ts` replaced by route handlers:
   `/sitemap.xml` (index) → `/sitemap-pages.xml`, `/sitemap-categories.xml`,
   `/sitemap-brands.xml`, `/sitemap-products.xml`, `/sitemap-blog.xml`.
   `lastmod` = the row's real `updatedAt` (blog: `publishedAt ?? updatedAt`;
   content pages: the `ContentPage` row's `updatedAt`; other static pages have
   no lastmod). Only `isActive` products/categories/brands and `PUBLISHED`
   posts — the same filter the pages use to decide 200 vs 404. Regenerated at
   most once an hour (`revalidate = 3600`). `/digital-commerce-guideline`
   (an indexable content page that was missing) was added to the pages
   sitemap. `<changefreq>`/`<priority>` were dropped (Google ignores them).
   robots.txt unchanged (already points at `/sitemap.xml`, does not block
   `/_next/` or `/uploads/`). The sitemap host comes from `APP_URL` at build
   time, exactly like robots.txt before — the server's `.env` has it.

#### Phase 1 files

| File | Change |
|---|---|
| `middleware.ts` | www/http → apex redirect + matcher `has` entries |
| `lib/seo/canonical-host.ts` (new) | `canonicalHostRedirect()` — the redirect decision |
| `lib/seo/canonical.ts` | `listingCanonicalUrl()` for paginated listings |
| `lib/seo/sitemap.ts` | per-section lists, `renderUrlset`, `renderSitemapIndex` |
| `app/sitemap.ts` (deleted) | replaced by the route handlers below |
| `app/sitemap.xml/route.ts`, `app/sitemap-{pages,categories,brands,products,blog}.xml/route.ts` (new) | sitemap index + children |
| `app/loading.tsx` → `components/ui/route-loading-skeleton.tsx` | moved; re-exported by `app/(storefront)/{shop,search,deals,flash-sale}/loading.tsx` and `app/(admin)/loading.tsx` (new) |
| `app/(storefront)/product/[slug]/page.tsx` | `notFound()` in `generateMetadata` |
| `app/(storefront)/category/[slug]/page.tsx`, `brand/[slug]/page.tsx` | `notFound()` in `generateMetadata`; pagination canonical |
| `app/(storefront)/shop/page.tsx`, `deals/page.tsx`, `offers/[slug]/page.tsx` | pagination canonical (offers/[slug] also `notFound()` in metadata) |
| `app/(storefront)/{brands,offers,flash-sale,pc-builder,complaint,product-request,track}/page.tsx` | self-canonical |
| `features/content/storefront-content-page.tsx` | self-canonical for the 10 CMS content pages |
| `deploy/nginx-techno-house.conf` | port 80 → apex in one hop; separate www 443 block → 301 |
| `deploy/nginx-seo.conf` (new) | the same, with the real domain, for the live server |
| `scripts/seo/check-baseline.ts` | sitemap/404/canonical/redirect regression guards |
| `scripts/seo/check-canonical.ts` (new), `package.json` | `npm run test:seo-canonical` — 34 logic checks |

#### Phase 1 verification (local `next build` + `next start`, 2026-11-09)

- `tsc --noEmit` clean; eslint clean on every changed file; `next build`
  exit 0 (only the pre-existing "middleware → proxy" deprecation warning).
- `npm run test:seo` → ok 62 checks; `npm run test:seo-canonical` → ok 34 checks.
- Redirects (`APP_URL=https://technohouse.com.bd`, Host header set by curl):
  - `www` + https → `301 location: https://technohouse.com.bd/warranty?utm=1`
  - `www` + http → `301` same location
  - apex + http (`X-Forwarded-Proto: http`) → `301` same location
  - apex + https → `200`
  - `POST` on www → `308` (method kept)
  - localhost with `X-Forwarded-Proto: http` → `200` (not touched)
- Status codes, each with curl / Chrome / Googlebot user agents:
  - `/product/does-not-exist-xyz`, `/category/…`, `/brand/…`, `/offers/…`,
    `/blog/…` → `404 404 404` (live was 200 + noindex). The 404 page still
    renders with the storefront header/footer.
  - a real product, category, brand and `/` → `200 200 200`.
- Canonicals (Googlebot UA, also present for Chrome UA): all 21 static pages
  self-canonical; `/shop?page=3` → `/shop?page=3`; `/shop?page=3&sort=price_asc`
  → `/shop`; `/category/desktop?page=2` → `?page=2`;
  `?page=2&brand=asus` → clean; `?sort=newest` → clean;
  `?page=2&utm_source=fb` → `?page=2`; `/brand/costume?page=2` → `?page=2`;
  `/deals?page=2` → `?page=2`; product → its own URL.
- Sitemaps (dev DB): index lists 5 children, each `200`,
  `application/xml`, `s-maxage=3600`; pages 18 URLs (9 with lastmod — the
  content pages), categories 345, brands 94, products 4,309, blog 1; every
  product/category/brand/blog URL has a lastmod; 4,767 URLs, all unique;
  balanced tags, valid dates, no unescaped `&`.

### Phase 2 — Titles, descriptions, headings

Branch `seo-phase-2` (from main after Phase 1 was merged and deployed).

All templates live in one pure module, `lib/seo/page-meta.ts` (no DB), and
`lib/seo/page-metadata.ts` turns them into Next `Metadata` (canonical, Open
Graph/Twitter, default OG image) plus the two small DB reads they need.

1. **Categories (B1, B9 + keyword map 3.2).** Title
   `{Heading} Price in Bangladesh {YEAR} | Techno House` (year = Dhaka calendar
   year, computed per request; falls back to "Price in BD" / no suffix when
   over 60). H1 = `{Heading} Price in Bangladesh`, the product count moved out
   of the `<h1>` into a `<p>` beside it (same line, same look).
   `{Heading}` is the keyword-map heading for the 28 mapped categories (e.g.
   networking → "Router & Networking", security → "CC Camera & Security",
   software → "Windows 11 Pro & Software"), otherwise the category name. Two
   pairs of categories share a name ("Intel PC" / "Ryzen PC" under both Gaming
   PC and Star PC) — those get the parent in brackets so titles stay unique.
   Descriptions: hand-written for the 28 mapped categories (primary keyword
   first, secondary keywords worked in), a template for the rest; an
   admin-written `Category.description` wins when set (none are set on dev).
2. **Brands (B2 + keyword map 3.3).** Title
   `{Brand} {main product type} Price in BD | Techno House` — the 12 mapped
   brands use their keyword type ("ASUS Laptop Price in Bangladesh", "Gigabyte
   Motherboard Price in BD", "Apple MacBook …"); every other brand's type is
   its biggest real category (`brandTopCategories()`: one grouped query,
   offer/umbrella categories skipped). Description lists the brand's real top
   categories. H1: mapped brands get the keyword, others keep the brand name.
3. **Products (B3, B4).** POS names are cleaned first (leading part code before
   `#`/`,` removed, stray `#`, ®/™ and warranty blocks dropped, shouted English
   words softened, brand added/normalised), then the model block + 1–2 short
   spec blocks are kept to fit 60 characters with " Price in BD", adding
   " | Techno House" only when it fits. Titles are made unique against the
   same brand's other products (`productSiblingNames()`): the words only this
   product has are added, then its part code. Description: name + "price in BD
   is ৳X" (only when the page shows a price — hidden for Up Coming and for out
   of stock unless Pre Order, the same rule as the product page; the price is
   the same `product.price` the JSON-LD uses), warranty label, "genuine
   {Brand}", "EMI available" only when the page's EMI teaser shows, delivery.
   The visible H1 still shows the full product name (unchanged).
4. **Static pages (B6).** 20 hand-written title/description pairs
   (`STATIC_PAGE_META`) for about, contact, faq, support, warranty, shipping,
   returns, terms, privacy, digital-commerce-guideline, brands, offers, deals,
   flash-sale, pc-builder, blog, shop, complaint, product-request, track. A meta
   title/description typed in Admin → Design Studio → Pages still wins (only
   digital-commerce-guideline has one). The content pages are placeholders on
   the live site ("Our story will appear here"), so their descriptions describe
   what the page is for rather than promising details it does not have.
5. **"Prices in ৳ are display-only"** and the other price disclaimers ("not a
   charge", "demo prices … nothing is charged") removed from every category
   description and category SEO paragraph in `lib/catalog/category-page-content.ts`.
6. **Headings (B7, B8).** Cart drawer + mobile menu title (`Sheet`), the cart
   drawer's empty-state title and the footer column titles are `<p>` now; the
   marquee notice bar is `role="note"` and headings inside its admin-written
   HTML render as `<div>` (`lib/content/demote-headings.ts`). The "under
   development" text itself is **not** removed or changed. Same look: a
   `.th-heading-like` class joins the global heading font rule and the
   `.th-rich-text h2–h4` rules apply via `:where(.th-heading-hN)`.
   Verified in headless Chrome against live: computed style identical for all
   of them on /category/laptop, /product/…, /about; heading outline of
   /category/laptop went from 33 to 23 entries (all chrome headings gone).
7. **Default og:image (item 6).** No 1200×630 brand asset existed, so
   `app/og/route.tsx` generates one with `next/og` (site name + the page's
   heading). Text is looked up server-side from `type` + `slug` — never taken
   from the query string — and unknown slugs 404. Used by category, brand and
   static pages (`og:image` with width/height 1200×630, `twitter:card
   summary_large_image`). Product pages keep the product photo.

#### Phase 2 files

| File | Change |
|---|---|
| `lib/seo/page-meta.ts` (new) | all title/description/H1 templates, keyword map tables, product-name cleanup |
| `lib/seo/page-metadata.ts` (new) | `staticPageMetadata`, `socialMetadata`, `ogImagePath`, `brandTopCategories`, `productSiblingNames` |
| `app/og/route.tsx` (new) | default 1200×630 OG image |
| `app/(storefront)/product/[slug]/page.tsx` | product title/description templates |
| `app/(storefront)/category/[slug]/page.tsx` | category title/description + OG |
| `app/(storefront)/brand/[slug]/page.tsx` | brand title/description + OG |
| `features/catalog/category-listing.tsx`, `category-listing-bar.tsx` | H1 text; count outside the H1 |
| `features/catalog/brand-listing.tsx` | keyword H1 for mapped brands |
| `features/content/storefront-content-page.tsx`, `lib/content/pages.ts` | content-page meta from `STATIC_PAGE_META`, admin override |
| `app/(storefront)/{about,contact,faq,support,warranty,shipping,returns,terms,privacy,digital-commerce-guideline}/page.tsx` | new `storefrontContentMetadata(slug)` signature |
| `app/(storefront)/{brands,offers,flash-sale,pc-builder,blog,complaint,product-request,track,shop,deals}/page.tsx` | `staticPageMetadata()` |
| `lib/catalog/category-page-content.ts` | price disclaimers removed |
| `lib/data/types/catalog.ts`, `lib/data/prisma/{category-repository,mappers}.ts` | optional `Category.description` exposed |
| `components/ui/sheet.tsx`, `components/ui/empty-state.tsx`, `components/layout/header-cart.tsx`, `components/layout/site-footer.tsx` | `<h2>` → `<p>` |
| `components/layout/marquee-notice-bar.tsx`, `lib/content/demote-headings.ts` (new) | `role="note"`, headings → styled `<div>` |
| `app/globals.css` | `.th-heading-like`, `:where(.th-heading-hN)` |
| `scripts/seo/check-page-meta.ts` (new) | `npm run test:seo-meta` — 383 checks |
| `scripts/seo/audit-meta.ts` (new) | `npm run seo:audit-meta` — READ-ONLY audit over the real catalogue |
| `scripts/seo/check-baseline.ts`, `package.json` | updated + new phase 2 guards |

#### Phase 2 verification (2026-11-09)

- `tsc --noEmit` clean; eslint 0 errors (3 pre-existing warnings in untouched
  files); `next build` exit 0.
- `test:seo` 69 ok, `test:seo-canonical` 34 ok, `test:seo-meta` 383 ok,
  a11y baseline 10 ok.
- `seo:audit-meta` on the dev DB (4,309 products, 345 categories, 94 brands):
  0 titles over 60; descriptions: 3 under 140, 0 over 160; categories and
  brands 0 duplicate titles; products: 40 groups / 91 products (2.1%) still
  share a title — spot-checked, these are duplicate listings in the data
  (same product with a "(N)"/"(S)"/"- M" location tag, "for EC4-CEET Project"
  notes, code-prefix vs code-suffix twins) and dev-only Microsoft licence
  records (none of those exist on the live site).
- `next start`: Phase 1 still holds (fake product/category/brand 404, www
  301, `?page=2` canonical, sitemap index); 60 random sitemap URLs 200 with a
  title.

#### Not changed (needs a decision)

- Other visible "display-only" sentences outside category descriptions are
  still on the live site: `/brands` ("Prices in ৳ are display-only"), `/shop`
  intro, `/deals`, brand page fallback text ("Prices in ৳ are for display and
  are not a charge"), home "About" block, product page
  (`product-summary.tsx` — warranty line + "Branch stock checks are
  display-only"), product service cards, cart drawer empty state ("Totals are
  display-only"), add-to-cart toast ("nothing is charged").
- Demo wording in the category buying-guide copy that is not about prices
  ("in the demo catalog" in brand tables, "Specs are demo catalog data" on
  /category/gaming, demo price-range rows on /category/wireless-charger and
  /category/accessories) — Phase 5 replaces this copy.
- Admin → Categories / Brands "Meta title / Meta description" fields are not
  saved anywhere (the form shows a computed value; there is no column), so
  they never reached the storefront — before or after this phase.
- Pages 2+ of a listing share page 1's title (only the canonical differs).
- The home page title/description come from Admin → SEO (unchanged).

### Phase 3 — Structured data

Branch `seo-phase-3` (from main after Phase 2 was merged and deployed).

1. **Product** (`lib/seo/json-ld.ts` `productJsonLd`). The offer is built
   from `displayedOffer()` (`lib/catalog/displayed-offer.ts`) — the same
   selection the buy box makes: the `?variant=` variant, else the cheapest
   in-stock variant (`defaultVariant`), else the product. Its price/stock is
   exactly what the page shows.
   - `offers` only when the page shows a price AND it is a positive number:
     never `price: 0`; no offers for Up Coming or for out of stock without Pre
     Order (the page hides the price there). Pre Order → `PreOrder`, low stock
     → `LimitedAvailability`.
   - `itemCondition: NewCondition`, `seller` = the Organization (`@id` +
     name), `priceValidUntil` only while a discount window is open, `url`,
     `sku` (the shown variant's), `mpn` from the model number when set, brand.
   - `image`: absolute URLs of the shown gallery; the "no photo" placeholder
     is never published (the field is left out instead).
   - `description`: plain text of the Quick overview.
   - **No `aggregateRating` / `review` at all** (the page shows stars with 0
     reviews; operator decision). The old conditional rating code was removed.
   - **No `shippingDetails` / `hasMerchantReturnPolicy`**: live `/shipping`
     and `/returns` are still placeholders ("… will appear here"), so there
     are no stated terms to describe.
   - The Phase 2 meta description now reads its price from the same
     `displayedOffer()` (it previously ignored the default variant).
2. **Organization** (sitewide, storefront layout): `@id`, logo (absolute),
   email, address with the postcode read from the stored address, one
   `ContactPoint` per phone number in `+880` form (branding phone + extra
   phones, split on commas — the live value "01611-305338, 0 1410-305338"
   becomes +8801611305338 and +8801410305338), `sameAs` = the footer's social
   links that are real https URLs (live: Facebook + YouTube; the `/contact`
   placeholders are skipped).
3. **ElectronicsStore** on `/` and `/contact` (`StoreJsonLd`): same address,
   phone, email, logo; `geo` = GeoCoordinates 23.739561, 90.385072 (operator-
   confirmed 2026-11-09; `STORE_GEO` in `lib/seo/json-ld.ts`, because the
   stored map link is a maps.app.goo.gl short link with no coordinates);
   `hasMap` = that Google Maps link from Business Settings; `priceRange "৳৳"`,
   `currenciesAccepted BDT`, `parentOrganization` → the Organization.
   **Opening hours intentionally omitted** (no `openingHours` /
   `openingHoursSpecification`): the "9:00–22:00" on the site is customer
   support hours, not confirmed shop opening hours. Add them once the real
   shop hours and days are confirmed. The visible footer text is unchanged.
4. **Category pages**: BreadcrumbList (unchanged) + `ItemList` of the products
   on the current page in display order (position continues across pages:
   page 2 starts at 21). No `FAQPage` — no category has an FAQ block yet
   (Phase 5).
5. **WebSite** gains `publisher` → Organization. Brand pages and the blog
   Article markup are unchanged.
6. **`npm run seo:check-schema`** (`scripts/seo/check-schema.ts`): 32 offline
   builder checks, then a crawl of a running site (home, contact, about, shop,
   brands, 8 random categories, 3 brands, N random products, plus `--paths=`)
   that parses every JSON-LD block and checks the required fields per type,
   absolute URLs, `+880` phones, no rating/review anywhere, exactly one
   Organization/WebSite per page, ElectronicsStore only on home/contact (with
   NO opening hours, and a numeric geo: latitude 23–24, longitude 90–91), and
   that every Product offer's price literally appears on the page. Read-only.

#### Phase 3 files

| File | Change |
|---|---|
| `lib/seo/json-ld.ts` | rewritten builders (Product, Organization, ElectronicsStore, ItemList, helpers) |
| `lib/catalog/displayed-offer.ts` (new) | the buy box's selection/price/stock as one function |
| `components/seo/site-json-ld.tsx` | Organization with footer `sameAs`; new `StoreJsonLd` |
| `app/(storefront)/page.tsx`, `app/(storefront)/contact/page.tsx` | `<StoreJsonLd />` |
| `app/(storefront)/product/[slug]/page.tsx` | Product JSON-LD from `displayedOffer`; meta price from the same |
| `features/catalog/category-listing.tsx` | ItemList |
| `scripts/seo/check-schema.ts` (new), `package.json` | `npm run seo:check-schema` |
| `scripts/seo/check-baseline.ts` | phase 3 guards (no ratings, offer rule, store/ItemList present) |

#### Phase 3 verification (2026-11-09)

- `tsc --noEmit` clean; eslint clean on changed files; `next build` exit 0.
- `test:seo` 74 ok, `test:seo-canonical` 34 ok, `test:seo-meta` 383 ok,
  `seo:check-schema --offline` 29 ok.
- `seo:check-schema` against `next start` (dev DB): 71 pages, 268 blocks,
  **3,187 checks ok** — 13 products with an offer (price found on the page),
  40 without (out of stock on dev → price hidden → no offer).
- Phase 1/2 regressions: 404s, www 301, `?page=2` canonical, Phase 2 titles
  unchanged.
- Dev DB has no real product photos (every image row is the placeholder), so
  dev output has no `image`; production photos are `/uploads/…webp` and come
  out as absolute `https://technohouse.com.bd/uploads/…` (offline check).
- Follow-up (same branch): opening hours removed, geo added. tsc + eslint
  clean, `next build` exit 0, `test:seo` 76 ok, `test:seo-canonical` 34 ok,
  `test:seo-meta` 383 ok, `seo:check-schema --offline` 32 ok,
  `seo:check-schema` against `next start`: 60 pages, 226 blocks, **2,732
  checks ok**; footer still shows "Hours 9:00–22:00".

### Phase 4 — Performance & images

Branch `seo-phase-4` (from main after Phase 3 was merged and deployed).

#### How images are served (checked before changing anything)

- Uploads live in `public/uploads/{products,brands,home,general,categories}`
  and are written at runtime by the admin media library
  (`lib/media/admin-media.ts`).
- The custom `next/image` loader (`lib/image-loader.ts`) already returns
  `/uploads/*` and `*.svg` URLs unchanged, so they never touch Next's image
  optimizer; nginx serves them straight from disk. The live home page makes
  zero `/_next/image` requests — the optimizer costs no CPU today.
- What was wrong on the live site (curl, 2026-11-09): `/uploads/*` responses
  carry **no Cache-Control at all**; hero/promo banners are 450–720 KB JPEGs
  shown ~380 px wide on phones; brand/product PNGs up to 330 KB; a 315 KB SVG
  (payment strip, really 10 embedded bitmaps) sent uncompressed; HTTP/1.1;
  nginx version in the Server header.

#### Approach chosen (low runtime CPU)

The production server is small (CPU near 47% during builds), so nothing
here encodes images per request:

1. **Pre-convert once, serve from disk.** `scripts/optimize-uploads.mjs`
   writes a WebP copy next to each png/jpeg (`foo.png` → `foo.webp`) and a
   smaller copy of oversized WebPs (`foo.min.webp`); banners max 1920 px /
   target < 150 KB, product/brand/category images max 1000 px / < 80 KB.
   Originals are never modified. New uploads get the same copy at upload
   time (`writeWebpVariant` in the media library; the copy is removed with
   the original).
2. **nginx picks the copy** (`deploy/nginx-seo.conf`): a `map` on the
   `Accept` header + `try_files` serves `foo.webp` for `foo.png` to browsers
   that accept WebP (all current ones) and the original otherwise, with
   `Vary: Accept`; `.min.webp` / `.min.svg` the same way. **Same URLs, no
   database change, no Node involvement** — and with the nginx block removed
   the copies are simply ignored (instant rollback).
3. **Long caching**: `Cache-Control: public, max-age=2592000` (30 days) on
   uploads (not `immutable`, since a URL's bytes change once when its copy
   appears); `/_next/static` served from disk with 1 year immutable; gzip for
   SVG/JS/CSS/JSON.
4. **Next's optimizer capped** for the few images that still use it (bundled
   demo/remote assets): `formats: ["image/webp"]` only (no AVIF — several
   times the CPU), 5 device sizes + 5 image sizes, `minimumCacheTTL` 30 days.
   Rejected: routing `/uploads` through `/_next/image` — it would encode
   every image at every width on first request, on the app server.

#### Changes

- **Zero layout shift**: product/category cards and the gallery already sat
  in aspect-ratio boxes. Added real intrinsic width/height (read once from the
  file header with sharp and cached — `lib/media/image-size.ts`) to the
  header and footer logos, the footer payment image and the blog cover, and
  explicit sizes to search thumbnails, popup, alert and order-line images
  (`next/image` where the source is always a site image; the order snapshot
  and the product gallery/lightbox stay native `<img>` in fixed boxes — the
  gallery for the reason in its own comment, the order line because a stored
  snapshot URL may be external and would hit the optimizer).
- **The real CLS source** was the marquee notice bar: it animated `left`
  (a layout property), which counts as layout shift on every page for as long
  as it runs. Now transform-only, same path (`app/globals.css`).
- **Hero**: first banner `priority` (preload + fetchpriority high + eager);
  the other slides' images are no longer all in the page at load — they were
  stacked in the visible box, so `loading="lazy"` never held them back. The
  next slide is added 2.5 s after one is shown (well before the 6 s autoplay)
  and any slide right before it is shown. Footer logo and payment image are
  lazy now (they were eager).
- **Mega-menu / mobile drawer**: the page renders the 18 department links
  only; panels and the drawer tree come from `/api/nav-menu` (static,
  rebuilt every 5 min) on first hover/focus of the bar or first open of the
  drawer. Checked: every one of the 345 active categories is in the sitemap,
  all 18 top-level ones are linked in every page's HTML, and all 327
  child links are on their parent category page ("Subcategories" row).
  Hover → panel with links (1 fetch per page view); drawer open → 18
  expandable groups.
- **SVGO** (`scripts/optimize-svg.mjs`): writes `foo.min.svg` next to
  `foo.svg`, dry run by default. SVGO's default preset **broke** the live
  payment SVG (3 of 18 logos vanished — checked in Chrome), so it runs with a
  conservative config; alone that saves only ~1–4% on this file, so the
  `--embedded-webp` option re-encodes the embedded bitmaps as WebP:
  314 KB → 166 KB (≈102 KB gzipped), rendering identical in Chrome.
- New deps: `sharp` 0.35.4 pinned (was only an optional dep of Next; the
  upload handler now relies on it), `svgo` 4.1.0 (dev, used only by the SVG
  script).

#### Phase 4 files

| File | Change |
|---|---|
| `next.config.ts` | optimizer limits (webp only, sizes, 30-day TTL) |
| `lib/media/webp-variant.mjs` + `.d.mts` (new) | shared WebP copy rules (script + upload handler) |
| `lib/media/admin-media.ts` | WebP copy on upload, removed on delete |
| `lib/media/image-size.ts` (new) | cached intrinsic size from the file header |
| `scripts/optimize-uploads.mjs` (new) | dry-run-by-default WebP copy writer |
| `scripts/optimize-svg.mjs` (new) | dry-run-by-default `.min.svg` writer |
| `scripts/perf/measure-pages.mjs` (new) | CLS / HTML / image-bytes measurement in headless Chrome |
| `features/home/home-hero-slider.tsx` | first slide priority, others mounted when needed |
| `app/globals.css`, `components/layout/marquee-notice-bar.tsx` | transform-only marquee |
| `lib/catalog/nav-menu.ts`, `app/api/nav-menu/route.ts`, `components/layout/use-nav-menu.ts` (new) | lazy menu data |
| `components/layout/category-nav.tsx`, `category-mega-nav.tsx`, `mobile-nav.tsx`, `site-header.tsx` | triggers only in the HTML |
| `components/layout/site-footer.tsx`, `site-header.tsx` | logo/payment images with intrinsic size, lazy below the fold |
| `components/layout/header-search.tsx`, `components/storefront/{dynamic-popup,site-alert}.tsx`, `features/account/account-order-detail-view.tsx`, `app/(storefront)/blog/{page,[slug]/page}.tsx` | explicit image sizes |
| `deploy/nginx-seo.conf` | phase 4 merge steps |
| `scripts/seo/check-baseline.ts`, `package.json`, `package-lock.json` | guards; sharp + svgo |

#### Phase 4 numbers (2026-11-09)

Headless Chrome, `scripts/perf/measure-pages.mjs`, median of 3; mobile =
412×823, 4× CPU; "throttled" = 150 ms RTT, 1.6 Mbps. Local = `next start`
on the dev DB with the marquee turned on (as on live; dev row restored
afterwards).

| Page | CLS before (local) | CLS after (local) | Live today |
|---|---|---|---|
| Home, mobile | 0.027 (throttled 0.026) | **0.000** (throttled 0.000) | 0.001 (throttled 0.026) |
| /category/laptop, mobile | 0.001 (throttled, with scroll 0.026) | **0.000** | 0.001 |
| /product/msi-b650m-project-zero, mobile | 0.001 | **0.000** | 0.001 |
| all three, desktop | 0.000 | 0.000 | 0.000 |

Every recorded shift before was the marquee track.

| HTML (decoded / over the wire) | Before | After |
|---|---|---|
| Home | 703 KB / 117 KB | **521 KB / 96 KB** |
| /category/laptop | 559 KB / 84 KB | **386 KB / 64 KB** |
| Product page | 376 KB / 59 KB | **204 KB / 39 KB** |

Image weight, live home page (mobile), measured by loading the live page in
Chrome and substituting the converted copies for each `/uploads` image the
way nginx will (conservative — the old HTML still loads every hero slide):

| | Before | After conversion + nginx |
|---|---|---|
| at load | 10 images / 3,463 KB | 10 images / **944 KB** (−73%) |
| after scrolling the whole page | 41 images / 6,209 KB | 41 images / **1,423 KB** (−77%) |

Conversion dry run on copies of those 41 images: 29 copies, 5,676 KB → 1,033
KB; 12 skipped (already small WebP). `--apply` on the copies: 0 originals
changed (sha256 before/after), second run writes nothing. nginx blocks:
`nginx -t` ok and exercised locally (nginx 1.22): png → webp only with
`Accept: image/webp`, original otherwise, `.min.webp`/`.min.svg` picked up,
gzip on SVG, 404 for missing files. Upload hook (dev DB, test file removed):
5.2 MB PNG → 110 KB 1920 px WebP next to it; delete removes both.

#### Phase 4 verification

- `tsc --noEmit` clean; eslint 0 errors (3 pre-existing warnings in
  untouched lines); `next build` exit 0.
- `test:seo` 86 ok (11 new phase-4 guards), `test:seo-canonical` 34 ok,
  `test:seo-meta` 383 ok, `seo:check-schema` 1,578 ok (37 pages), a11y 10 ok.
- Phase 1–3 still hold (404s, www 301, titles, JSON-LD).

### Phase 5 — Content & data quality

Branch `seo-phase-5` (from main after Phase 4 was merged and deployed). No
migration. Nothing in this phase wrote to the production database or /uploads.

1. **`scripts/fix-catalog-text.mjs`** (run with tsx; `npm run
   seo:fix-catalog-text`). Dry run by default: writes `product-names.csv`,
   `image-alts.csv`, `slugs.csv`, `duplicates.csv`,
   `slug-redirects.proposed.json` and `summary.md` to `docs/seo-reports/`
   (git-ignored, so a run on the server can never block `git pull`).
   `--apply --fix=names|alts|slugs --confirm-db=<name>` first saves a JSON
   backup of every row, then changes everything in one transaction;
   `--restore=<backup>` puts it back. `--fix=slugs` refuses unless every
   change is already in `lib/seo/slug-redirects.json`. Duplicates are
   report-only. Rules: `lib/catalog/text-fixes.ts`, `lib/content/alt-text.ts`.
   - A leading POS part code ("3813C001AA # Canon …") moves to the end in
     brackets instead of being deleted. Checked on dev: 0 titles over 60, same
     duplicate count, no `#` left in a title.
   - Slugs: only a `-copy` suffix or a cut in the middle of a word counts. The
     importer cut all slugs at 80 characters, so `truncated_mid_word` is large
     (928 on dev) for a small gain; `--slug-reason=copy` limits a run to the
     `-copy` ones (2 on the live site).
2. **Slug redirects without a migration**: `lib/seo/slug-redirects.json`
   (ships empty) + `lib/seo/slug-redirects.ts`. The product page consults it
   only when the slug is not in the database, then `permanentRedirect`s.
   **Next's `permanentRedirect` answers 308, not 301**; search engines treat
   them the same.
3. **Runtime safety nets**: `safeAlt` falls back to the product/banner title
   for empty or junk alts (`mappers.ts`, `home-banners.ts`); the product page's
   star row is hidden at 0 reviews. No rating schema anywhere.
4. **Category intros from files**: `content/category-intros/{slug}.md`,
   `lib/content/category-intro.ts`, `features/catalog/category-intro-block.tsx`,
   FAQPage JSON-LD from the same items, first page of the listing only. A file
   replaces the built-in demo copy; admin-written HTML still shows.
   **All 12 are held as drafts**: a file with `<!-- draft -->` or any `[VERIFY]`
   is not rendered. To publish one: confirm the claims, remove that line and
   every marker, deploy. `CONTENT_PREVIEW=1` shows drafts for local review.
5. **Blog**: `BlogPosting` → `Article`, `BreadcrumbList` added; both validated
   by `seo:check-schema`; posts are in `sitemap-blog.xml`. Five drafts in
   `content/blog/*.md`, not imported anywhere.

Not done, as instructed: "display-only" sentences and admin meta fields.

#### Phase 5 verification (2026-11-10)

`--apply`, `--restore`, the slug guard, the redirect, alt fallback and stars
were exercised on a throwaway copy of the dev database (created from a
template, dropped afterwards), so dev data was not touched: guards refused
without `--confirm-db`; restore left names, slugs, alts and banners
hash-identical; old slug → 308 to new (keeps `?variant=`), new slug 200,
unknown slug 404; stars absent at 0 reviews, present with a published review.
`tsc` clean, eslint 0 errors, `next build` ok, `test:seo` 89, canonical 34,
meta 383, `test:seo-phase5` 193, `seo:check-schema` 1,744, a11y 10. All 38
category links in the drafts exist on the live site.

### Phase 6 — Trust pages

Branch `seo-phase-6-pages` (from main at e022d95), pushed, **not merged**.
Source text: `docs/SITE-PAGES-CONTENT.md` (committed with this phase so the
server seeds exactly the reviewed text).

#### Approach

The eight routes (/about, /contact, /faq, /warranty, /shipping, /returns,
/terms, /privacy) are **DB-managed**: each renders `StorefrontContentPage`,
which reads the `ContentPage` row staff edit in Admin → Design Studio → Pages.
On production those rows are absent or empty, so the live pages show the
`ContentStub` placeholder. The owner approved (2026-11-10) putting the text into
those rows with a seed script rather than moving the pages to files.

- **Policy values** live in `lib/site/policies.ts` (section 0 of the content
  file: addresses, phones, emails, support hours, 24 h / 3 days / 7 working
  days / 1–3, 2–7, 1–2 working days). Stored bodies hold `{{tokens}}`
  (`{{phoneRma}}`, `{{refundWorkingDays}} working days`, …) which
  `StorefrontContentPage` fills at render time, **before** sanitizing, so a
  value changed in policies.ts changes every page. Staff editing a page in
  Admin will see the tokens; leave them as written.
- **Seed** `scripts/seed-trust-pages.mjs` (tsx), same safety model as
  `fix-catalog-text.mjs`:
  - dry run by default: previews (`<slug>.html` with values filled,
    `<slug>.stored.html` as stored) and `summary.md` in
    `docs/seo-reports/trust-pages/` (git-ignored);
  - `--apply --confirm-db=<DATABASE_URL db name>`: JSON backup of the rows
    first (`…/trust-pages/backups/`, including "row did not exist"), then one
    transaction writing `title`, `body`, `metaTitle`, `metaDescription`
    (metaKeywords untouched);
  - a page whose body is non-empty and different is **skipped** unless
    `--overwrite` (an admin's own text is never replaced silently); an empty
    body is filled without it; `--only=faq,terms`; `--restore=<backup>`
    (deletes rows that did not exist before);
  - refuses to write if any policy value is still spelled out in the content
    file (content and policies.ts disagree), a token is unknown, the
    sanitizer would drop any generated markup, or a field is over the admin
    limits. Only the eight slugs are ever touched.
- **Markdown → HTML** (`lib/site/trust-pages-markdown.ts`, shared by the seed
  and the checker): `##` → page title (the single H1), `###` → h2; FAQ group
  headings h2, each **question** h3 + answer p; tables, lists, bold, site
  links; the "(Render each Q/A…)" instruction line skipped;
  `[Open in Google Maps]` → the Business Settings map link (`{{googleMapsUrl}}`,
  the same link as the ElectronicsStore `hasMap`; a Maps search for the
  showroom address only if that setting is empty). "Last updated: 10 November
  2026" is part of the stored /terms and /privacy text.
- **Empty body → unchanged placeholder.** `getStorefrontContentPage` still
  returns null for an empty body and the page renders the same `ContentStub`
  as before; verified against the live site (same H1, text, title, no new
  JSON-LD). Deploying this code before seeding changes nothing visible.
- **JSON-LD** (`lib/seo/json-ld.ts`), on a published page: BreadcrumbList
  Home > page (also shown as visible breadcrumbs), AboutPage on /about,
  ContactPage on /contact, FAQPage on /faq built from the rendered h3/p (so it
  always equals the visible text). Organization + ElectronicsStore
  `contactPoint` from policies.ts: the three sales numbers as customer
  service, the RMA number as technical support, support email, areaServed
  BD, en + bn; geo and hasMap kept; still no openingHours.
- **Product Offer**: `shippingDetails` (only while /shipping is published —
  checked per request, cached) = destination BD, handlingTime 1–2 days,
  transitTime 1–7 days (the two windows combined), not for pre-order offers.
  **`hasMerchantReturnPolicy` is OFF** (owner decision, 2026-11-10, before
  merge): a finite return window of 3 days reads as general returns, but
  /returns accepts only wrong, missing or damaged items (24 hours) and
  dead-on-arrival items (3 days), not change of mind, so the schema would not
  match the visible policy. The builder stays in `lib/seo/json-ld.ts`
  (BD, finite window, `merchantReturnDays` 3, ReturnByMail + ReturnInStore,
  link to /returns; software category → MerchantReturnNotPermitted) behind
  `MERCHANT_RETURN_POLICY_MARKUP` in `lib/site/policies.ts` (default `false`,
  also needs /returns published) and is unit-tested, so switching it on later
  is a one-line change. While it is off the product page does not even query
  /returns.
  **Left out on purpose:** `returnFees` (who pays depends on whose error it
  was — no clean schema value), `shippingRate` (zone + weight based, shown at
  checkout), separate Dhaka / outside-Dhaka shipping regions (no clean region
  code for "Dhaka city"), business-day calendars.

Owner decisions applied (2026-11-10): /shipping "We send an SMS when your
order is handed to the delivery team." → "You can follow your order on the
tracking page at any time." (content file + seed; the order-confirmation SMS
sentence stays). **Guest checkout: not possible** — `checkout-view.tsx` shows
"Checkout requires a customer account" without a session and
`placeCustomerOrder` (`lib/orders/create-order.ts`) refuses without one — so
the FAQ "How do I place an order?" answer keeps the original sign-in wording.
(The step-1 note that "the checkout page does not require a session" was
wrong.)

#### Files

New: `lib/site/policies.ts`, `lib/site/trust-pages-markdown.ts`,
`scripts/seed-trust-pages.mjs`, `scripts/seo/check-phase6.ts`
(`npm run test:seo-phase6`), `docs/SITE-PAGES-CONTENT.md`.
Changed: `features/content/storefront-content-page.tsx` (tokens, breadcrumbs,
page JSON-LD, `data-page-content` wrapper, token fill in metadata),
`lib/content/pages.ts` (`getStorefrontContentPage` cached per request,
`isContentPagePublished`), `lib/seo/json-ld.ts`,
`app/(storefront)/product/[slug]/page.tsx` (offer policies),
`scripts/seo/check-schema.ts` + `check-baseline.ts` (the "no
shippingDetails while placeholder" guards became "only behind the
published-page gate"), `package.json` (script only — no dependency change).

#### Results (2026-11-10)

- Final run after the return-policy flag change (before merge): `tsc
  --noEmit` 0 errors; eslint clean on all changed files; `next build` OK
  (Turbopack, build `xW3x8eCV4Y9ZCUq-AN_Bq`, built in a separate worktree
  because a `next dev` was running in the main folder).
- Offline: `test:seo-phase6` 59, `test:seo` 92, `seo:check-schema --offline`
  49, `test:seo-phase5` 198, `test:seo-meta` 383 — all pass.
- Live, against that build (`next start` on 127.0.0.1:3200, proven fresh: its
  `/_next/static/<BUILD_ID>/_buildManifest.js` answered 200) pointed at a
  throwaway copy of the dev DB, seeded with `--apply --overwrite`:
  `test:seo-phase6 --base=… --mobile --products=<5 in-stock slugs>`
  **334/334**: 200, title + description =
  content file and unique, one H1, h1 > h2 > h3, canonical, no noindex, all
  JSON-LD parses, FAQPage = the file's 19 Q/As, 11 internal links all 200 (no
  redirects: /track, /b2b/register, /product-request, /pc-builder, the 8
  pages), phones/emails = policies.ts, no placeholder/under
  development/lorem/TODO/{{token}} in the content, figures as required, all
  eight in sitemap-pages.xml and linked from header/footer, 375px: no
  horizontal scroll, tables fit; the 5 named in-stock products (one software)
  carry `shippingDetails` and no `hasMerchantReturnPolicy`.
  `seo:check-schema --products=25 --paths=<the eight>`: 2,250 checks pass.
  (Offers need stock; only 50 of ~4,300 dev-DB products have one, so the
  checker takes `--products=<slugs>` for products that must carry an offer.)
- Seed exercised on the throwaway DB only: dry run, refusals (no / wrong
  `--confirm-db`, unknown `--only`), create, skip-without-`--overwrite`,
  overwrite, idempotent re-run ("nothing to change"), both `--restore`s
  (back to the exact original state, including the deleted /privacy row),
  empty body filled without `--overwrite`. With /about and /returns bodies
  emptied the pages rendered the unchanged placeholder (same H1, text and
  title as production, no new JSON-LD). The "/shipping unpublished → no
  `shippingDetails`" gate is covered by the offline schema checks, not by a
  live run; map link = hasMap.
- **Not run on production or the dev DB** (`--apply` never used there).

Incident during testing (fixed, happened twice): removing the build worktree
with `git worktree remove --force` emptied six packages in the main
`node_modules` (@node-rs/argon2, @prisma/adapter-pg, @prisma/client, postcss,
puppeteer, sharp). Cause: the Turbopack build writes links in
`<worktree>/.next/node_modules` that point at the real packages, and the
removal followed them (deleting the `node_modules` junction first does not
help). Restored each time with `npm install` from the unchanged lockfile; 0
packages missing, tsc 0 errors, argon2 / sharp / puppeteer / Prisma
smoke-tested. `package-lock.json` is identical to HEAD. Any `next dev` /
`next start` that was running at 22:45 or 23:00 should be restarted.

#### To publish (owner, when ready)

On the server after merge + deploy (no schema change, no `npm ci`):

    cd ~/techno-house
    npx tsx scripts/seed-trust-pages.mjs                 # dry run: read summary + previews
    npx tsx scripts/seed-trust-pages.mjs --apply --confirm-db=technohouse
    # only if the dry run shows "SKIP: has its own body" and that text may go:
    npx tsx scripts/seed-trust-pages.mjs --apply --overwrite --confirm-db=technohouse
    # undo:
    npx tsx scripts/seed-trust-pages.mjs --restore=docs/seo-reports/trust-pages/backups/<file>.json --confirm-db=technohouse

No restart is needed (pages and product markup read the rows per request).
Then: `npm run test:seo-phase6 -- --base=https://technohouse.com.bd` and the
Rich Results Test on /faq and one product.

#### Needs owner decision

1. **Footer phone typo** "0 1410-305338": owner fixes it in Admin → Business
   Settings (no code change). The schema already reads phones from
   policies.ts.
2. **Footer column has no /warranty link** on the live site (the header has
   it, so the "header or footer" check passes). Footer columns are DB
   settings (Admin → footer settings); add it there if wanted.
3. **Offer return-policy markup is off** (see "Product Offer" above).
   Switch it on with `MERCHANT_RETURN_POLICY_MARKUP = true` in
   `lib/site/policies.ts` only if the owner decides the policy/wording should
   change, or a schema value that matches "wrong/damaged/dead-on-arrival only"
   is chosen.
4. **Site-wide marquee** "The website is currently under development" is still
   live (kept since phase 2 by instruction). The checker scans page content
   only, so it passes, but visitors and crawlers still see it next to the new
   policy pages.
5. **Policy numbers** are the approved defaults; the content file still says
   "Status: DRAFT … proposed defaults" in its header (not shown on any page).
6. **Contact numbers in the schema** now come from policies.ts (4 numbers incl.
   01410-881771 and the RMA line 01311-211433), not from Business Settings.
   If a number changes, change it in `lib/site/policies.ts` (and the footer
   setting).
7. **`npm run test:security` was 1/22 red — resolved (AD-400, separate
   commit "security: sanitize promotion description on read; allowlist
   reviewed raw-HTML sinks").** Three raw-HTML sinks were not on the
   script's reviewed allowlist; two predate the SEO work (marquee bar
   2026-10-16, offers page 2026-10-23) and one is Phase 5
   (`category-intro-block.tsx`). Marquee and category intros were safe (sanitized
   on read / built from repo files). The offers page rendered
   `Promotion.descriptionHtml` raw (sanitized on save only); it now runs
   `sanitizeBlogBody` on read. All three are on the allowlist with reasons,
   with pin checks; `test:security` is 27/27. Verified on a production build
   against a throwaway DB: the stored terms HTML is byte-identical to what
   the page renders, and a script/onerror/javascript: value written straight to
   the DB is stripped. No promotion in the dev DB had a description (fixture
   used).

### Phase 8 plan — product-level SEO for ~500 products (investigation + proposal only)

Branch `seo-phase-8-plan` (from main after Phase 6/PR #7). **Nothing in the site
code, database, nginx or pm2 was changed.** The only new files are
`scripts/seo/product-seo-report.mjs` (read-only) and this section. Everything
below that needs production data is a number the owner gets by running the
report on the server (command at the end). The local DB (`techno_house_dev`,
4,309 "active" products, 0.6 % with a real image, 98.8 % out of stock) is dev
data and only proves the script runs; none of its percentages describe the live
catalogue.

#### 1. Where each product's SEO text comes from today

| Thing | Source (code) | Product fields used |
|---|---|---|
| `<title>` | `generateMetadata` in `app/(storefront)/product/[slug]/page.tsx` → `productTitle()` (`lib/seo/page-meta.ts`) | `name`, `brand.name`, names of same-brand siblings (to keep titles unique); variant title when `?variant=` |
| meta description + OG description | same → `productDescription()` | name/brand, the displayed price, `isPreOrder`, `isComingSoon`, warranty label, EMI config |
| H1 | `features/product/product-summary.tsx` | `name` (or the selected variant's title) — the raw POS name, not cleaned |
| main image alt (gallery, OG image alt) | `ProductImage.alt`, passed straight to `<Image alt>` / `openGraph.images.alt` (`lib/data/prisma/product-repository.ts`) | `ProductImage.alt` (a product with no image gets `name`) |
| JSON-LD Product description | `lib/seo/json-ld.ts` | `overviewHtml` (plain text) else `overview[]` |
| URL | `Product.slug` | set once at creation / import |

**Template when nothing is stored** (and there is never anything stored, see 2):
`productTitle` = cleaned short name (`cleanProductName`: POS code, warranty
blocks and comma spec tails dropped, SHOUTING softened, brand put first) +
` Price in BD` + ` | Techno House` only if the result is ≤ 60 chars (about a quarter of the local titles); colour /
part-code variants get extra distinguishing words or the part code.
`productDescription` = `"{name} price in BD is ৳{price}."` (or "coming soon" /
"price in BD and availability") + `"{N} year warranty, genuine {Brand}."` +
`"EMI available."` + `"Delivery across Bangladesh."` + filler, fitted to
150–160 chars. It states today's price and the warranty label.

**Fields that exist for SEO text:** `Product` has **none**. There is no
`metaTitle`, `metaDescription`, `metaKeywords`, `seoTitle`, `seoDescription` or
alt column on `Product`. (They exist on `ContentPage` — `metaTitle`,
`metaDescription`, `metaKeywords` — and `BlogPost` — `seoTitle`,
`seoDescription`; `Category` / `Brand` have a `description` column only.)
`ProductImage.alt` is the only product-level SEO text that is stored.

#### 2. Why the admin meta fields are "not saved" — diagnosis

Admin → Products → **SEO meta tags** card (`features/admin/products/admin-product-form.tsx`):
`const [seoTitle, setSeoTitle] = useState(product?.name ?? "")` and
`seoDescription` seeded from `product.overview.join(" ")`, rendered as
"Meta title" / "Meta description" inputs (lines ~1131–1180). The save handler
builds `fields: { name, slug, … overview, overviewHtml, … }` and **never includes
`seoTitle` / `seoDescription`** (no occurrence in the action, in
`lib/catalog/product-input.ts` or in `lib/catalog/admin-products.ts`), and the
Prisma `Product` model has no column to put them in. So they are throw-away
component state: whatever staff type is lost on save, and the box is
pre-filled with the product name only as a cosmetic default. The same is true of
the category and brand forms: their "Meta title" is never submitted, and
"Meta description" is saved into the `description` column (Phase 2 found that
neither reaches the page meta, which those pages build from templates). Even if a value were stored, `generateMetadata` has no code path that
reads one: the title and description are always computed.

**Fix (not done):** (a) add nullable `Product.metaTitle`, `metaDescription` (and
optionally `metaKeywords String[]`, `focusKeyword`) — one additive migration;
(b) add them to `ProductInput` / `saveAdminProduct` (+ length caps 60 / 160, the
existing `ContentPage` caps 150 / 300 are too loose) and the product form
(`fields`) so the card really saves, with a live character counter;
(c) in `generateMetadata` and the OG tags use the stored value when it is
non-empty and fall back to `productTitle` / `productDescription` when it is
empty; (d) read them in the repository select (`lib/data/prisma/product-repository.ts`)
and the bulk CSV import (new optional `meta_title`, `meta_description` columns).
Until (a)–(c) ship, nothing typed in that card can reach Google.

#### 3. Proposed deterministic generator (database fields only)

Implemented in `scripts/seo/product-seo-report.mjs` so it can be reviewed on real
output (`generated.csv` has it for every active product). It reuses the existing
`cleanProductName` / `cutAtWord`; it states **no price, stock or warranty** and
invents no spec.

**seoTitle ≤ 60 — "{Brand} {Model} {Type} Price in Bangladesh":**
1. base = first block of `cleanProductName` (brand first, POS code / warranty /
   comma spec tail already gone); type = the leaf category name (singular,
   "(Desktop)" qualifiers stripped, umbrella categories like "All Laptop",
   "Offers" skipped, walking up to the parent).
2. Type is added only if the name does not already say it (head noun of any
   non-umbrella category in the chain appears in the name — "Desktop", "Charger").
3. Whole base fits with `" Price in Bangladesh"` → use it.
4. Else drop the spec tail: keep brand + everything up to and including the first
   model token (first token with a digit after the brand).
5. Still too long → `" Price in BD"`; still too long → drop the type; then cut at
   a word boundary (flagged).
6. `" | Techno House"` is appended only if the title is still ≤ 60.
7. Uniqueness (to add in the apply step; see 5): titles that collide get the
   existing `productLabel` sibling words / part code, or are left to review.

**metaDescription 120–155:** `"{Brand Model Type}: {spec}, {spec}, {spec}. Price in BD at Techno House. Delivery in Dhaka and across Bangladesh."`
- 3–4 specs from `ProductAttributeValue` in a per-family order (laptop/desktop:
  processor, RAM, storage, graphics, display; monitor: size, panel; components:
  socket, form factor, RAM type, capacity, wattage …), then spec chips; values
  that repeat the name or each other ("512GB" / "512GB SSD") are skipped;
  junk values are filtered (the `graphics` attribute holds "Headset" / "Keyboard"
  on some products; booleans like Yes/No are dropped).
- Delivery wording is the /shipping page's own ("Dhaka city" + courier "across
  Bangladesh"); no delivery days (they differ by area), no price (stale-prone),
  no warranty (varies by product and the label is free text), no stock.
- Fillers ("Compare specs and order online.") only to reach 120. Products with
  fewer than 3 specs get a shorter, still-truthful text and a flag
  (`only N specs`) — they are the weakest candidates for selection.

**Keywords (CSV only, not shown on the page):** primary
`{brand model} price in bangladesh`; secondary `… price in bd`, `… specs`,
`… review`, `{brand} {type} price in bangladesh` (matches keyword map §3.4;
"review" is a search variant only — no review text or rating is ever claimed).

**Image alt (main image only):** `{Brand} {Model} {Type}` ≤ 125 chars (same
core as the title, no "Price"), skipped if it would still be junk
(`isJunkAlt`). Today the alt is the raw name on essentially every product
(local DB: 100 %), which is long and POS-ugly rather than empty.

**Known limits shown by the local run (all fixable in the apply step):**
(i) variants share generated titles — **33.7 % of local products collide** (513
groups; e.g. two Canon ink colours, "Photo Cyan"/"Photo Magenta"), so the apply
step must reuse `productLabel` disambiguation or skip the product; (ii) the
existing name cleaner splits at "- " so "MT- M4715G" becomes "MT"; (iii) products
filed in the wrong category (an ink cartridge under "Large Format Printer")
get a wrong type word — a data fix, not a generator fix; (iv) `Product.name`
from POS is the only model source: `Product.modelNumber` is filled on 0 % of
the local products (the production report prints the real share).

#### 4. Choosing ~500 — three methods (nothing selected yet)

| | Method | Rule | Needs |
|---|---|---|---|
| A | Sales / demand | non-cancelled `OrderItem` lines by units, plus `ProductViewEvent` counts, top 500 | order + view history. Both tables exist; locally 4 orders / 31 views, so it only works if the live shop has enough history — the report prints the counts. |
| B | Category priority + in stock + complete data | in stock/low stock, price > 0, real image, real brand, usable type, ≥ 3 specs; tier-1 families from the keyword map (laptop, desktop, monitor, CPU, GPU, SSD, RAM, motherboard, printer, networking, CC camera), round-robin across families by data completeness | catalogue data only |
| C | Price tier | highest-priced in-stock products per family (≥ 15,000 BDT), assuming higher value = more search intent | catalogue data only |

**Recommendation: B, with A as the tie-breaker inside each family.** Reasons:
the generator's output is only trustworthy when specs exist, so B directly
selects the products it can describe well and keeps the 500 spread over the
categories the keyword map already targets (A concentrates on whatever sold
most, and a young shop's sales history is thin and bestseller-skewed; C
favours expensive items that few people search by model). Out-of-stock
products are excluded because their price/offer is hidden and Google drops the
result. The report's section c) gives the counts per method and per family on
the real catalogue (and the round-robin spread of a 500 pick), so the owner can
check that ~500 eligible products exist before approving B.

#### 5. Storage and apply design

**generateMetadata does not honour any stored product meta** (section 2), so the
existing-fields route is not available. Minimal schema change (not run):

    ALTER TABLE "Product"
      ADD COLUMN "metaTitle" TEXT,
      ADD COLUMN "metaDescription" TEXT,
      ADD COLUMN "seoKeyword" TEXT,        -- primary keyword, for the CSV / admin
      ADD COLUMN "seoGeneratedAt" TIMESTAMP(3),
      ADD COLUMN "seoGeneratedHash" TEXT;  -- hash of the generated pair at write time

One additive Prisma migration, all nullable, no backfill, rollback = drop the
columns. `generateMetadata` (title, description, OG) uses `metaTitle` /
`metaDescription` when non-empty, else the current templates, so un-selected
products do not change. Image alt needs no column: `ProductImage.alt` exists.

**Apply script** `scripts/seo/apply-product-seo.mjs` (later phase), same
safety model as `seed-trust-pages.mjs` / `fix-catalog-text.mjs`:
- dry run by default → writes `docs/seo-reports/product-seo/apply-preview.csv`
  (id, slug, old → new title / description / alt, length, rule, flags) and
  `summary.md`; changes nothing;
- `--apply --confirm-db=<DATABASE_URL db name>`; saves a **JSON backup of every
  row it will change** (`metaTitle`, `metaDescription`, `seoKeyword`, the main
  image id + alt) to `docs/seo-reports/product-seo/backups/` first; one
  transaction per batch of 200;
- `--restore=<backup.json> --confirm-db=…` puts the old values back (NULL stays
  NULL);
- input is a reviewed CSV (`--ids=approved-500.csv`, the owner's selection), never
  "all products"; `--only=<slug,slug>`;
- an **admin edit is never overwritten**: a row is skipped when `metaTitle` /
  `metaDescription` is non-empty and its hash no longer equals
  `seoGeneratedHash` (i.e. a human changed it) unless `--overwrite`; a main
  image alt that is already good (not junk, not equal to the raw name) is kept
  unless `--overwrite-alts`;
- refuses titles > 60, descriptions outside 120–155, duplicate titles inside the
  approved set (after sibling disambiguation) and a `needs_review` flag;
- CSV report of every skip with the reason.

#### 6. Report only — suffix and slugs (no change made)

**"Price in BD" vs "Price in Bangladesh".** The code produces `"… Price in BD"`
on every product title (`lib/seo/page-meta.ts` `productTitle`; ~25–30 % also
carry `| Techno House`) and `"price in BD"` in the description. Categories and
brands use "Price in Bangladesh" (Phase 2). The keyword map's product pattern
lists both `{model} price in bd` and `{model} price in bangladesh`. A blind
swap adds 9 characters: on the local DB 1,273 of 4,309 titles would still fit
in 60 chars, 3,036 would overflow and need shortening, and 670 of 1,087 that
carry the brand suffix would lose it — every title changes. The proposed
generator uses "Price in Bangladesh" on 3,952 of 4,309 (92 %) and falls back to
"Price in BD" only when brand + model + type alone exceed 60 chars. Run the
report on production for the real numbers (section "Title suffix report").

**Slugs.** `slugifyProduct(name)` = lower-case, non-alphanumerics → `-`, cut at
`PRODUCT_SLUG_MAX = 80` (`lib/catalog/product-input.ts`); bulk import uses the
CSV `slug` column or the same function on the full POS name
(`lib/catalog/bulk-csv.ts`). So long names give long slugs that embed spec
strings and are cut mid-word. Local DB: 32 % at the 80-char cap, 83 % with 8+
segments or an embedded spec (gb/tb/inch/w), median 69. Competitors use
`/dell-latitude-3520-core-i5-laptop`. A short slug can be derived from the same
brand + model + type core the title uses, but **changing slugs is out of scope
for Phase 8 and needs an owner decision**: every changed slug needs a 308 in
`lib/seo/slug-redirects.json` (mechanism and `fix-catalog-text.mjs --fix=slugs`
already exist from Phase 5, which refuses to run unless the redirects are
deployed), collisions need disambiguation (the Cyan/Magenta ink example above
would produce the same short slug), and every redirect has to be maintained. Recommended order: ship title/description/alt for the 500 first,
measure in Search Console, then decide slugs for the same 500 only.

#### Needs owner decision

1. **Approve the schema change** (nullable `Product.metaTitle`, `metaDescription`,
   `seoKeyword`, hash/timestamp) and the admin fix so the existing "SEO meta tags"
   card really saves. Without it nothing can be stored.
2. **Selection method** — recommended B (category + stock + complete data, A as
   tie-breaker); confirm after seeing the production counts.
3. **"Price in Bangladesh" on product titles** (generator default, "Price in BD"
   only as a length fallback) — or keep "Price in BD" everywhere.
4. **Description wording**: no price, stock or warranty in the generated text
   (today's template quotes the live price and warranty label). Approve, or say
   which of them to keep (price goes stale; warranty label is free text).
5. **Duplicates**: when two products generate the same title, disambiguate with
   colour / part code (as the storefront does today) or leave them to the
   current template.
6. **Slugs**: leave as they are (recommended for now) or plan short slugs with
   redirects for the selected 500 later.
7. **Data fixes outside the generator**: wrong-category products, junk `graphics`
   values, products with fewer than 3 specs (excluded from selection).

#### Run the report on the server (read-only)

    cd ~/techno-house && git pull origin seo-phase-8-plan   # or copy scripts/seo/product-seo-report.mjs
    npx tsx scripts/seo/product-seo-report.mjs

It prints `database: technohouse — READ-ONLY …`, writes `docs/seo-reports/product-seo/`
(`summary.md`, `generated.csv`, `samples.csv`, `profile-*.csv`,
`selection-counts.csv`; git-ignored) and exits. Paste `summary.md` back; it
contains no secrets. It has no `--apply` flag, only SELECTs, and the Prisma client
is wrapped so any write call throws.

### Phase 8 build — generator v2, schema, admin wiring, apply script

Branch `seo-phase-8-build` (from main after PR #8), pushed, **not merged**. Nothing was
run against production; the migration was applied to the LOCAL dev DB only.

#### What the production report found, and what fixed it

| Report finding | Cause in v1 | v2 |
|---|---|---|
| "Netis N3 Price in Bangladesh" (no Router) | "type already in the name" was checked on the whole name, then the spec tail (with "Router") was cut | The type is added unless the head noun of any category in the chain is in the text that is **kept**: "Netis N3 AC1200 Router Price in Bangladesh" |
| "Casio Portable THERMAL" (lost PTP-II) | Model detection needed a digit; PTP-II has none | Hyphenated letter codes count as model tokens; model + type are never cut: "Casio Portable THERMAL Printer PTP-II Price in Bangladesh" |
| "ASUS VZ24EHF" (no Monitor) | same as Netis | "ASUS VZ24EHF Monitor Price in Bangladesh \| Techno House" |
| 31 % of titles collide (Dell 3420-CORP 8GB vs 4GB) | no disambiguation | Colliding titles get the distinguishing spec (RAM, storage, capacity, size, CPU, colour / spec word from the name, part code); still colliding → `needs_review`, `title_collision`, shared `collision_group`, never written |
| "Intel processor brand", "Default, WPS button", "Air Cooler type", "POS Printer item" | free-text label + value glued together | Specs come only from per-family **slots** (CPU, RAM, storage, display, socket, chipset …) that must read a valid value ("Core i7-1255U", "16GB RAM", "Air cooling"); brand / item / series / warranty labels are never read; Default / N/A / Yes / No / repeated words / "item" are dropped |
| stock data not refreshed | v1 text said "order online" | No stock, price, warranty or "order online" anywhere; neutral closing only |
| "Netis N3" alt without type | alt = title core without type when redundant | alt = brand + model + type, always (asserted) |
| `modelNumber` on 6 products | — | Used only as an anchor when it is found inside the cleaned name; otherwise the model is derived from the name (first token with a digit, or a hyphenated code, plus following model tokens and suffixes such as Ti / XT) |

**Generator rules** (`lib/seo/product-seo.ts`, pure, no DB):
- **Title** ≤ 60: `{Brand} {product-line words} {Model} {Type} Price in Bangladesh`; too long →
  `Price in BD` (full name) → product-line words trimmed (still `Price in Bangladesh`) →
  trimmed + `Price in BD`; model and type are never cut. `| Techno House` only if it
  still fits. If even brand + model + type exceed 60 the title is kept whole and the
  row is flagged `title_over_60` + `needs_review` (never written).
- **Description** 120–155: `{Name}: spec, spec, spec. {closing}` with 4 lead wordings and
  4 closings picked by a hash of the product id. Closing 0 is the owner's sentence ("Check
  price and availability at Techno House. Delivery in Dhaka and across Bangladesh."); the
  other three are shorter ("… Delivery across Bangladesh.") so 3–4 specs still fit in 155.
  Order of attempts: most specs first; "65 inch display" → "65 inch" compaction before
  dropping a spec; a neutral "See full specifications on the product page." only for
  products with ≤ 2 specs.
- **Spec templates** per family (27, plus a generic fallback): laptop (CPU, RAM, storage, display), monitor (size,
  resolution, refresh, panel), motherboard (socket, chipset, form factor, memory type), GPU
  (chip, VRAM), processor (cores, threads, base / boost), RAM, SSD, HDD, PSU, case, cooler,
  printer, large-format printer, IP camera, NVR, router, switch, cable (category, length,
  shielding, fibre, connector), IP phone, flat panel, capture card, headphone, speaker,
  keyboard, mouse, UPS, other. Family comes from the leaf category name first, then the chain.
- **Keyword**: `{brand model} price in bangladesh`; secondary: `price in bd`, `specs`,
  `review`, `{brand} {type} price in bangladesh` (CSV only).

#### Schema (additive, nullable)

`prisma/migrations/20261111120000_product_seo_meta/migration.sql`:
`Product.metaTitle`, `metaDescription`, `seoKeyword` (TEXT), `seoSource` (TEXT, CHECK in
`('generated','admin')` or NULL), `seoGeneratedAt` (TIMESTAMP). No backfill; every existing
row stays NULL, so every page keeps today's output until a value is stored. Applied to
`techno_house_dev` only.

#### Storefront

`generateMetadata` → `resolveProductMeta(stored, template)`: a non-empty stored title /
description is used **verbatim** (also as og:title / og:description); an empty one falls
back to the existing `productTitle` / `productDescription` template. A shared
`?variant=` link keeps the variant's own title (AD-390). JSON-LD and everything else are
untouched.

#### Admin → Products → "SEO meta tags"

Meta title / description now submit and save (they were never sent before). 60 / 155
character counters (red over the limit; hard server caps 100 / 200), "Use suggestion"
buttons, the generated text shown as the placeholder while empty ("Left empty, the page
uses the standard title and description"). Source tracking (`planSeoMetaWrite`): hand-typed
or edited text → `seoSource='admin'`; saving a form without touching generated text keeps
`'generated'`; clearing both removes the stored text and the source. Bulk CSV import does
not send the fields, so it never touches them. (The product-name field no longer overwrites
the meta title as you type.)

#### `scripts/seo/apply-product-seo.mjs` (via tsx)

    npx tsx scripts/seo/apply-product-seo.mjs                          # DRY RUN: review CSV, changes nothing
    npx tsx scripts/seo/apply-product-seo.mjs --select-batch=500       # picks batch 1 → batch-1.csv (read-only)
    npx tsx scripts/seo/apply-product-seo.mjs --batch-file=<csv> [--limit=N]
    npx tsx scripts/seo/apply-product-seo.mjs --batch-file=<csv> --apply --confirm-db=<db name>
    npx tsx scripts/seo/apply-product-seo.mjs --restore=<backup.json> --confirm-db=<db name>

Options: `--overwrite` (also replace hand-written text, or stored text with no source),
`--apply-alts` (off by default; only alts equal to the raw product name, never needs_review
rows), `--allow-few-specs`, `--force` (restore rows edited since), `--out`.
- Titles are generated for **all** active products first, so collisions are found across the
  whole catalogue, then filtered by the batch file.
- `--apply` refuses without `--confirm-db` matching the DATABASE_URL database, and without
  `--batch-file` or `--limit` (it never writes to every product by default).
- A JSON backup of every row it will touch is written first (`…/backups/product-seo-<time>.json`),
  then rows are written in transactions of 200. Slugs are never touched.
- Skipped, with the reason in `apply-preview.csv`: `needs_review` (unresolved collision / over
  60), description outside 120–155, fewer than 3 specs, text written by hand or with no source
  (unless `--overwrite`), `unchanged`.
- `--restore` puts the backed-up values back; a row edited after the apply is skipped unless
  `--force` (and an alt edited by hand is left alone).
- Review CSV columns: id, slug, name, category, action, current title (template), stored title /
  source, new title (+ length, rule), new description (+ length), keyword, secondary keywords,
  flags, collision group, new alt, alt action.
- **Batch selection** (`--select-batch`): quality filter = price > 0, real image, real brand,
  usable type, ≥ 3 usable specs, resolved unique title, valid lengths, no text stored yet
  (**stock ignored**). Weighted round-robin over leaf categories: priority families (laptop,
  motherboard, graphics card, monitor, processor, RAM, desktop, large-format printer, IP
  camera / NVR, UTP / fibre cable, IP phone, interactive flat panel, capture card) weight 3,
  others 1; inside a category more specs, then having a description. Prints the count per
  family and per leaf category (`batch-1-summary.md`).

#### Production runbook (NOT run — for the owner)

Order matters: the new build selects the new columns, so **migrate before the new build
serves traffic**; the old build keeps working on the migrated schema (additive), so
rollback = restart the previous build (`docs/DEPLOYMENT.md`: no down-migrations).

    cd ~/techno-house
    # 1. backup (pg_dump custom format + uploads); adjust APP_DIR/BACKUP_DIR to the server layout
    APP_DIR=$PWD BACKUP_DIR=$HOME/backups ./deploy/backup-db.sh
    # 2. code
    git fetch origin && git checkout seo-phase-8-build      # after merge: git pull origin main
    # 3. schema (nothing else changes: package-lock is untouched, no npm ci needed)
    npm run db:migrate:status          # expect exactly one pending: 20261111120000_product_seo_meta
    npm run db:migrate:deploy
    npx prisma generate
    # 4. build and restart
    npm run build && pm2 restart techno-house
    # 5. dry run (read-only) and batch selection; review the CSVs, then decide
    npx tsx scripts/seo/apply-product-seo.mjs --select-batch=500
    npx tsx scripts/seo/apply-product-seo.mjs --batch-file=docs/seo-reports/product-seo/batch-1.csv
    #    open docs/seo-reports/product-seo/apply-preview.csv + apply-summary.md

Writing (only after the owner approves the preview; start small):

    npx tsx scripts/seo/apply-product-seo.mjs --batch-file=docs/seo-reports/product-seo/batch-1.csv --limit=20 --apply --confirm-db=technohouse
    # check 3-4 of those product pages (title / meta description in view-source), then the rest:
    npx tsx scripts/seo/apply-product-seo.mjs --batch-file=docs/seo-reports/product-seo/batch-1.csv --apply --confirm-db=technohouse
    # undo: npx tsx scripts/seo/apply-product-seo.mjs --restore=docs/seo-reports/product-seo/backups/<file>.json --confirm-db=technohouse

No restart is needed after applying (pages read the columns per request). Image alts are a
separate, later step (`--apply-alts`).

#### Verification (2026-11-10/11, local)

- `tsc` 0 errors; eslint clean; `next build` OK (build `XUA1K9hD7YFYdIlbvb9RZ`, in a separate
  worktree because a `next dev` was running in the main folder).
- Suites: `test:security` 27, `test:seo` 92, `seo:check-schema --offline` 49, `test:seo-meta` 383,
  `test:seo-phase5` 198, `test:seo-phase6` 59, new `test:seo-product` **369**, new
  `test:seo-product-meta` 11 offline — all pass.
- Live, on a throwaway copy of the dev DB, new build vs the previous (pre-phase-8) build on the
  same DB: `test:seo-product-meta --base --old` **298/298** — 80 of 80 sampled products without
  stored meta have a byte-identical `<title>`, meta description, og:title and og:description;
  25 products with stored meta render their text verbatim (title-only and description-only
  products keep the template for the other half). Product JSON-LD identical apart from the origin.
  `seo:check-schema --base --products=20`: 1,863 checks.
- Admin card in headless Chrome (`scripts/seo/check-admin-product-meta.ts`, local demo staff on the
  throwaway DB): **13/13** — placeholder = generated suggestion, counters, typed text saved with
  source `admin` and shown again after reload and on the storefront, untouched save keeps
  `generated`, edit flips to `admin`, clearing both falls back to the template title.
- Apply script on the throwaway DB: refusals (no / wrong `--confirm-db`, no batch file, mixed
  modes); apply of 120 rows (titles ≤ 60, descriptions 127–155, slugs untouched, one backup);
  re-run = 120 `unchanged`; a hand-written row and a no-source row skipped, replaced only with
  `--overwrite`; `--apply-alts` changed 118 alts and left a custom alt alone; `--restore` of the
  overwrite, alt and original backups, skipping the rows edited since. Weighted round-robin
  checked (Motherboard 61 : Headphone 20 for weights 3 : 1). The local catalogue is thin
  (5 of 4,309 products pass the filter; 183 once the test copy's placeholder images were treated
  as real), so batch-1 counts per category come from the production run.

#### Needs owner decision (Phase 8 build)

1. **Closing wording**: your sentence is closing 0; three shorter variants say "Delivery across
   Bangladesh" (no "in Dhaka and") so 3–4 specs fit in 155 characters. Approve, or keep only
   the long sentence and accept 2–3 specs.
2. **Products with fewer than 3 usable specs are skipped** by default (a thin generated text is
   worse than today's template with price + warranty). `--allow-few-specs` overrides; those
   rows get a neutral "See full specifications on the product page." filler.
3. **Today's descriptions quote the live price and warranty; the generated ones do not.** After an
   apply, a product's meta no longer carries "price in BD is ৳…". That was the decision for
   this phase (stale ERP data); say if you want the template kept for some families.
4. **Review `apply-preview.csv` on production before the first write** — the unit fixtures are
   reconstructed from the report's descriptions (the raw rows were not available). Look at
   `flags`, `title_rule` (esp. "product-line words trimmed", "'Price in BD' fallback") and
   `collision_group`.
5. **Unresolved collisions** (identical names with identical SKU/part code) stay on the current
   template; they appear in the CSV with `collision_group` for a data fix.
6. Hand-typed text in Admin now wins over generated text and is protected from the apply script
   (`--overwrite` to replace). Confirm that is the intended precedence.
7. Image alts and slugs are not touched by default (`--apply-alts` is a separate step; slugs are
   out of scope for this phase).
8. `scripts/seo/product-seo-report.mjs` (plan phase) still embeds the v1 generator; the apply
   script's dry run is now the source for generated output. The report remains valid for the
   data profile and selection counts.

### Phase 8 fix — generator v2.1 (model identity)

Branch `seo-phase-8-fix` (from main after PR #9). Triggered by the production dry-run of
413 products. Code only: no schema change, no site-code behaviour change (the product page
and admin card are untouched; the admin suggestion placeholder uses the same generator).
Nothing was run on production.

#### The five production samples, before → after

(Sample 4's raw name was not in the report; it is reconstructed from the old keyword and title,
and the old generator reproduces your reported output on all five.)

| # | Before | After (v2.1) |
|---|---|---|
| 1 | `GIGABYTE AMD X870M Motherboard Price in Bangladesh` (lost "A ELITE WF7") | `GIGABYTE AMD X870M A ELITE WF7 Motherboard Price in BD` |
| 2 | `GIGABYTE AMD B550M GIG-B550M-5 Motherboard Price in BD` (real model "H ARGB" dropped, SKU code added) | `GIGABYTE AMD B550M H ARGB Motherboard Price in Bangladesh` |
| 3 | `Corsair HS50 Blue Headphone Price in Bangladesh` | `Corsair HS50 PRO STEREO Gaming Headset Price in Bangladesh` |
| 4 | title `GIGABYTE B760M DS3H DDR4 Motherboard Price in Bangladesh`, keyword `gigabyte intel chipset b760m ds3h ddr4 price in bangladesh` (different cores) | title `GIGABYTE Intel Chipset B760M DS3H DDR4 Motherboard`, keyword `gigabyte intel chipset b760m ds3h ddr4 motherboard price in bangladesh` (same core) |
| 5 | `Corsair HS50 Blue Headphone with Over-ear, Wired, Built-in microphone.` | `Corsair HS50 PRO STEREO Gaming Headset – wired over-ear headset with built-in mic. Price and availability at Techno House. Delivery across Bangladesh.` |

Sample 1's description now reads `…WF7 Motherboard: AM5 socket, X870 chipset, Micro-ATX, DDR5.` Sample 4 has no
"Price in …" suffix because brand + model core + type is 50 characters and neither suffix fits
without dropping a core token (rule 1: "then the core alone").

#### Rules implemented (`lib/seo/product-seo.ts`)

1. **Model core** = the brand plus everything in the raw name before the first spec boundary:
   a comma, a spaced dash, "(", `with / for / including`, `Socket`, a number with a unit (also glued,
   `128MB+128MB`, `1200Mbps`), a resolution, `4K`, an ordinal ("11th Gen"), `USB / HDMI / PCIe …`, a CPU word
   (`Core / Ryzen / …`, `Intel`/`AMD` before one) once a model code has been seen, and `DDR4` / `Wi-Fi` unless
   they close the model name ("B760M DS3H DDR4,", "B650M-A WIFI II,"). Glued separators (`:` `|` `•` and a comma
   with no space) are boundaries too. The core is never cut.
2. **Model run** = the first model code (digits, or a hyphenated code such as `PTP-II`) plus the codes / line
   words right after it (`A ELITE WF7`, `H ARGB`, `PRO STEREO Gaming`, `X LIGHTSPEED`), and everything before it back
   to the brand. Capital words later in descriptive text ("…fingerprint and EM card reader") are not model.
3. **Shortening** (title ≤ 60), from the END of the name, never the run: `Price in Bangladesh` → (drop droppable
   words) → `Price in BD` → model core + type alone (no suffix). Droppable = after a high-entropy code
   (`DS-K1T320EFWX-B`, `G502`, `AC1200`: letters + digits) the descriptive tail ("Value Series Face Access
   Terminal"); after a low-entropy model (`212`, `14`) only colours / "Dual Band" with nothing identity-bearing
   after them, so "Hyper 212 **Black Edition** CPU Cooler" keeps its words. A title that cannot fit is
   **refused** (`title_over_60`, `needs_review`), never cut.
4. **No foreign codes.** SKU / barcode / `modelNumber` are never used (they were the source of `GIG-B550M-5`); the
   only code a collision may add is the POS code that led the raw name, plus colour / spec / `DDR4` words from the
   name and RAM / storage / CPU attributes. A code-like token in a title that is not in the raw name sets
   `foreign_code` (skip).
5. **Type word**: the raw name's own word (`Headset`, `Router`, `Cord`, `Printer`) when it agrees with the
   category's group (Headset ~ Headphone, Cord ~ Cable); otherwise the category type. A name word that disagrees
   ("…ULTRA Series **Processor** # Z890 UD" on a motherboard) is a modifier and ignored.
6. **Keyword = title core** (`brand + model core + type`) `+ " price in bangladesh"`; secondary keywords
   (`price in bd`, `specs`, `review`) and the image alt use the same core.
7. **Descriptions**: per-family natural phrases: `wired over-ear headset with built-in mic`, `27 inch 3840x2160 IPS
   monitor, 60Hz`, `inkjet, 44-inch width, 2400x1200dpi`, `2MP bullet IP camera, 2.8mm lens, 30m IR`; list families
   stay lists (`Core i7-1255U, 16GB RAM, 512GB SSD, 15.6 inch display`). The old `"… with <adjective list>"` lead is
   gone ("with" only appears before "built-in mic[rophone]"). When room is short a compact wording is tried before a
   spec is dropped (drop the repeated noun, "Micro-ATX form factor" → "Micro-ATX", "built-in microphone" → "mic").
8. **Safety gate** (`lib/seo/product-seo-apply.ts`, unit-tested): a model-looking token of the model run missing from
   the title sets `model_token_lost` → action `skip: model_token_lost`, never written (also beats `--overwrite` and
   `unchanged`). The dry-run summary prints the count and lists the products; `apply-preview.csv` has a
   `model_tokens_lost` column.

**One deliberate narrowing of the gate you described.** You asked that "every model-looking token of the core
(a digit, an uppercase code, or a line word)" be in the title. Taken literally over the whole core, descriptive
tails that contain digits or capitals ("Capacity-Max.1000", "…and EM card reader") would be gated as "lost" although
dropping them is correct, and those products would be skipped. The gate therefore checks every model-looking token of the
**model run and everything before it** (exactly what the title may never drop). Tail tokens outside the run are
descriptive and may be dropped. If you prefer the literal reading, it is a one-line change in `lostModelTokens`
(`i < name.must` → `i < name.core.length`) at the cost of more skips.

#### Verification (2026-11-11)

- `tsc` 0 errors; eslint clean; `next build` OK (build `rrq_2dT3s1rheMp8VzvOf`, separate worktree).
- `test:seo-product` **928** checks (was 369): 41 model fixtures: the production samples plus laptops, monitors,
  routers, NVR, printers, coolers, four headsets, mouse, UPS, SSD, GPU, cameras, access control, 7 B650 boards from
  GIGABYTE / ASUS / MSI with different model lines, and shapes found in the catalogue: `:High quality…`, `,SEA-118SS`,
  `128MB+128MB`, `(PRO3300SFCU)`, partial brand "Smart PC", `POWER SUPPLY`, a junk licence name). Per fixture: no
  model token lost, no foreign code, the type word, keyword = title core, no ungrammatical "with …", ≤ 60 / 120–155,
  neutral wording; set-wide uniqueness; determinism and input-order independence; the gate and apply decisions.
- Other suites unchanged and passing: `test:security` 27, `test:seo` 92, `seo:check-schema --offline` 49,
  `test:seo-meta` 383, `test:seo-phase5` 198, `test:seo-phase6` 59, `test:seo-product-meta` 11.
- Live on a throwaway DB copy: `test:seo-product-meta --base --old` 258/258 (60 of 60 sampled products without
  stored meta byte-identical to the previous build; 25 with stored meta render it verbatim); admin card 13/13 in
  headless Chrome (the generator is bundled into the form); apply flow select → apply (30) → rerun `unchanged` →
  restore → writable again.
- Sweep of all 4,309 local products (dry run, read-only; local data, not production): `model_token_lost` 0,
  `foreign_code` 0, no "Headphone" for a Headset, keyword ≠ title core 0, no ungrammatical "with …". 207 would be written
  (needs ≥ 3 specs), 3,444 skipped for < 3 specs, 658 `needs_review` (404 title collisions that cannot be split, and 275
  titles that cannot fit in 60, half of those licence / part-number junk names).

#### Needs owner decision (Phase 8 fix)

1. **Titles without "Price in …"**: when brand + model core + type fit in 60 but no suffix does, the title is the core
   alone (rule 1). Locally 382 of 4,309 (8.9 %); the production dry-run summary prints the real count
   ("Titles with no 'Price in …' suffix"). Alternative: allow dropping pure vendor-noise words in the core
   ("Intel Chipset", "AMD") for those, or accept a title of up to ~70 characters.
2. **Titles that cannot fit** are refused (`title_over_60`, never written). Locally 275, about half (139) are
   `HO/…_…` licence strings and part-number descriptions that need a human name anyway. Say if titles up to ~70
   characters are acceptable for the rest.
3. **Low-entropy models keep their tail words** ("Hyper 212 Black Edition", "Air 540 Arctic White High Airflow …"): they
   are never cut, so some long names are refused rather than shortened. Safe, but more review rows.
4. **The literal gate reading** (see above): current = model run, literal = whole core.
5. Descriptions repeat the type noun when the title already ends with it ("…Headset – wired over-ear headset …");
   dropped automatically only when the room is needed. Say if you would rather always drop it.

#### Re-run the dry-run on the server (read-only; no migration, no build needed)

    cd ~/techno-house
    git fetch origin && git checkout seo-phase-8-fix        # after merge: git pull origin main
    npx tsx scripts/seo/apply-product-seo.mjs                           # DRY RUN: nothing is changed
    npx tsx scripts/seo/apply-product-seo.mjs --select-batch=500        # batch 1 (read-only)
    # read docs/seo-reports/product-seo/apply-summary.md  (model_token_lost, foreign_code, no-suffix counts)
    # and apply-preview.csv (columns flags, model_tokens_lost, title_rule)

A build + `pm2 restart techno-house` is only needed to ship the admin form's suggestion placeholder; the storefront
and the apply script do not need it.

### Phase 8 v2.2 — generator hygiene

Branch `seo-phase-8-fix-2` (from main after PR #10, which has v2.1). Code only: no schema change, no
database access beyond read-only `findMany` for the local sweep, nothing run on production.

#### What the production dry-run (387 products) found, and the cause of each

| Defect | Cause | Fix |
|---|---|---|
| `Dell LATITUDE 3420-CORP-(Core i3-1115G4-14" FHD Laptop`, `…MT-CORP-(INTEL 8GB RAM Brand PC`, part number `G13(21NXS0N800)` in the title | the core only ended at a token that *starts* with "(", so `-(Core` and `G13(21N…)` were glued into the model; quotes (`14"`) were not boundaries | `(`, `[`, `"` (and `14"` / `14''` as the inch unit) end the core wherever they sit in a token; trailing hyphens and channel SKU suffixes (`-CORP`, `-BRAC-SUPP`, `-ASA`, `-BG`) are stripped; bracket content never reaches the title, keyword or collision extras |
| `LATITUDE`, `OPTIPLEX`, `INTEL` shouted | only a fixed generic-word list was softened | shouted brand / line words (5+ capitals) **before the first model code** become Title Case; the model run keeps the raw spelling (`MT`, `WF7`, `B650-PLUS` — also fixes `B650-Plus` that the shared shouting list produced inside a model code) |
| `0GB storage`, RAM lost (`16.0GB DDR5, 512GB SSD`) | **`scripts/deploy/populate-import-attributes.ts`** wrote the stored attributes: `(\d{1,3})\s*GB` matches the `0GB` in `16.0GB`, and storage took the first GB figure *near* "SSD", which for `8GB, 1x8GB-512GB SSD` is the RAM figure (local data: `ram=0GB; storage=0GB`, `storage=8GB`). The generator trusted them | shared parser `lib/catalog/spec-extract.ts`: sizes read as whole decimals (`16.0GB` = 16, `1.0TB` = 1TB), RAM vs storage by the nearest keyword (DDR / LPDDR / RAM / Memory / MHz vs SSD / NVMe / HDD / eMMC), the corporate `8GB, 1x8GB-512GB SSD` convention, two storage sizes = ambiguous = not stated, zero is never a value. **The populate script now uses it too**, and the generator reads RAM / storage / CPU **from the raw name** and replaces a stored attribute that is zero, repeats the RAM figure or contradicts the name |
| `over-ear` for Edifier Comfo Q OWS; "with built-in microphone" for headsets | the same script **guesses** `Over-ear` for any "headset / headphone" and `Microphone=Yes` for any "headset"; the generator turned "Yes" into "Built-in microphone" | a form factor / microphone is stated only when the raw name says it, or a stored spec **row** (no attribute key) does; an attribute `Over-ear` or bare `Yes` without name evidence is ignored; "built-in" only when a spec says so; no ANC / Bluetooth-version claim is ever emitted |
| `bluetooth`, lower-case standards | free text from slots | `lib/seo/casing.ts`: one map (Bluetooth, Wi-Fi, USB, USB-C, Type-C, HDMI, DisplayPort, DDR3/4/5, LPDDR, IPS, OLED, LED, RGB, SSD, HDD, NVMe, SATA, PCIe, RAM, QHD/FHD/UHD, 4K, GHz/MHz/Hz/GB/TB units, AMD, Intel, NVIDIA, GIGABYTE, ASUS, MSI, HP, LG …) applied to non-model title words, description text and collision extras (keywords are lower-case anyway) |
| `…Scanner)` (type word taken from after a cut kept its bracket), `512GB storage` as a title extra | found by the sweep below | edge punctuation stripped from that word; the storage extra is the size (+ SSD / HDD) |

#### New gates (the row is skipped, counted and listed)

- **`bad_chars`**: title, keyword or description contains a quote, ANY bracket, a character outside
  `A–Z a–z 0–9 space . , : ; & + / % ' | -` (and our own " – " lead), a double space, or a word that starts
  or ends with a hyphen. Dry-run summary: count, kinds and the first 25 slugs; preview CSV column `bad_chars`.
- **`spec_zero`**: a description spec value that is zero or empty (`0GB storage`, `0 ports`). Zero is also
  rejected at the source (every spec phrase and every attribute), so the gate is the safety net: on the local
  catalogue it skips 0 rows because nothing zero reaches a description any more. Column `zero_specs`.
- Both sit in `lib/seo/product-seo-apply.ts` (unit-tested), before the stored-text rules, so they also beat `--overwrite`.

#### Before → after (fixtures from the real raw names; Latitude 3540 / 7450 are reconstructed in the same style because the local DB has no such rows)

| Product | Before (v2.1) | After (v2.2) |
|---|---|---|
| Latitude 3420 FHD | `Dell LATITUDE 3420-CORP-(Core i3-1115G4-14" FHD Laptop` | `Dell Latitude 3420 8GB RAM Laptop Price in Bangladesh` (set; split from the HD model by the RAM in the name) · `…Laptop: Core i3-1115G4, 8GB RAM, 512GB SSD.` |
| Latitude 3420 HD | `Dell LATITUDE 3420-CORP-(CORE I3-1115G4-14" HD Laptop` · `Core i3, 4GB RAM` | `Dell Latitude 3420 4GB RAM Laptop …` · `Core i3-1115G4, 4GB RAM, 1TB HDD` |
| Latitude 3440 | `Dell LATITUDE 3440-CORP-(Core i3-1215U-14" FHD Laptop` | `Dell Latitude 3440 Laptop Price in Bangladesh \| Techno House` · `Core i3-1215U, 8GB RAM, 512GB SSD` |
| Latitude 3540 / 7450 | `…3540-CORP-(Core i5-1335U-15.6" FHD Laptop` | `Dell Latitude 3540 Laptop …` / `Dell Latitude 7450 Laptop …` · `Core i5-1335U, 16GB RAM, 512GB SSD` |
| Optiplex 3000 MT | `Dell OPTIPLEX 3000 MT-CORP-(INTEL Brand PC Price in BD` | `Dell Optiplex 3000 MT Brand PC Price in Bangladesh` · `Core i5-12500, 8GB RAM, 1TB storage` |
| ThinkPad X1 Carbon G13 | `Lenovo ThinkPad X1 Carbon G13(21NXS0N800) Laptop` | `Lenovo ThinkPad X1 Carbon G13 Laptop Price in Bangladesh` · `Core Ultra 7 255H, 32GB RAM, 1TB SSD` |
| Lenovo V15 G5 IRL (16.0GB) | `…Laptop – Core i5, 0GB storage.` | `…Laptop, Core i5-13420H, 16GB RAM, 512GB SSD.` |
| Edifier Comfo Q OWS | `…Headphone Back – over-ear headphone.` | `…Headphone Back.` + the neutral specs pointer (no form factor; flagged `few_specs`) |
| Logitech G435 | `…: bluetooth over-ear headset with built-in microphone.` | `…Headset: Bluetooth headset.` (`few_specs`) |
| Logitech ZONE 300 | `…: bluetooth over-ear headset with built-in mic.` | `…Headset: Bluetooth headset.` (`few_specs`) |
| the five earlier samples | — | title, keyword and description **byte-identical** to v2.1 (compared against main; titles asserted in the tests). The " – " description lead is kept on purpose, so the gate allows exactly that character |

(Headsets now carry fewer specs because the two "specs" the import script guessed are gone. With
fewer than 3 they are skipped by default, as intended: nothing unsupported is written.)

#### Sweep over all 4,309 local products (read-only; v2.1 from main vs v2.2 on the same inputs)

| Defect class (rows) | Before | After |
|---|---|---|
| quote / bracket in title, keyword or description | 154 | **0** |
| zero spec (`0GB`, `0TB`, `0GHz` …) in the description | 1 | **0** |
| `over-ear` in the description, raw name does not say it | 78 | **0** |
| lower-case proper noun / standard (bluetooth, usb, ssd …) | 6 | **0** |
| double space | 0 | 0 |
| hyphen at the start / end of a word | 0 | 0 |

Rows now skipped by each new gate: `bad_chars` **208** (179 contain `_`: `HO/Rabbi_Max International_…` licence strings; 8 `*`
as in `2*USB3.0`; 7 `=`; the rest stray non-ASCII: soft hyphens, zero-width spaces, fullwidth brackets, curly apostrophes,
`Ý`), `spec_zero` **0**, `model_token_lost` 0, `foreign_code` 0. Rows that would be written: 207 → **260** (the raw-name
RAM / storage / CPU lifted 137 laptops and desktops to ≥ 3 specs; headsets dropped out as above). **Defects among
the rows that would be written: none** (before: 1 bracket, 27 unsupported over-ear, 5 lower-case standards).

#### Verification

`tsc` 0 errors; eslint clean; `next build` OK (build `osX_SuE7Z3pRX0ft0HsEP`, separate worktree); `test:seo-product` **1,292** checks (was 928: the 12 real-name fixtures in
the set and alone, exact-name parser cases, casing map, gates, claim rules; every v2.1 check unchanged and passing, the
five earlier samples' titles asserted); `test:seo-product-meta` 11, `test:security` 27, `test:seo` 92,
`seo:check-schema --offline` 49, `test:seo-meta` 383, `test:seo-phase5` 198, `test:seo-phase6` 59.

v2.1 expectations changed on purpose: `3420-CORP` is now `3420` (channel suffix); "with microphone" is a legitimate
phrase for an explicit stored mic spec.

#### Needs owner decision (Phase 8 v2.2)

1. **The wrong attributes are still in the database.** The populate script keeps existing values ("already had a value,
   untouched"), so fixing it does not repair `ram=0GB`, `storage=8GB`, `audioType=Over-ear` rows that are already
   stored; they also drive the catalogue filters. The generator no longer trusts them, but a one-off cleanup (rows equal
   to `0GB`, storage repeating RAM, guessed `Over-ear` / `Microphone=Yes`) is yours to approve; I did not touch data.
2. **Headsets have fewer than 3 specs** and are skipped by default until real specs exist (the name often has only
   "Bluetooth", "Wired"). `--allow-few-specs` writes them with a neutral specs-pointer sentence.
3. **The `bad_chars` allow-list is deliberately conservative**: product names with `*`, `=`, `_`, `#`, curly quotes or other
   non-ASCII are skipped for a human name rather than cleaned automatically. Widening it is a one-line regex in
   `findBadChars`.
4. **The populate script changed** (RAM / storage extraction only, for future runs): `storage` is now the keyword-matched
   figure (it used to be the first figure near "SSD"), and two unclear storage figures return nothing.

### Phase 8 v2.3 — batch tooling, filter funnel, description polish

Branch `seo-phase-8-fix-3` (from main after PR #11, which has v2.2). Code only: no schema change, nothing run on
production. The local database was read, never written (the script's Prisma client throws on any write call outside
`--apply` / `--restore`).

#### Why `--select-batch` selected 0 of the remaining ~1,904

1. **Certain, fixed: the selection ignored `--allow-few-specs`.** The filter had `specsAvailable >= 3` written into it; the
   flag was only read later by the apply decision. It now takes its minimum from the same option parsing as every other
   mode (`--allow-few-specs` = 0, `--min-specs=N` = N, default 3) and prints which one it used.
2. **Unknown without a measurement: which other criterion blocks them.** That is what `--explain-filter` answers. Run it
   on the server before deciding anything: on the local database the biggest blocker is not the specs (see below).

#### `--explain-filter` (read-only; alone, or together with `--select-batch`)

For the active products WITHOUT stored text it writes `docs/seo-reports/product-seo/filter-funnel.md` and prints its top:

- the population (active, with stored text split by source, without = the funnel);
- **a waterfall**: for each criterion in the order the filter applies it — price > 0, real image, not coming soon, real
  brand, usable type, at least N specs, resolved unique title, the gates `model_token_lost` / `foreign_code` /
  `bad_chars` / `spec_zero`, valid lengths — how many fail it on their own (rows overlap), how many it removes first
  (rows add up) and how many are left; then the biggest blocker;
- **what a lower minimum would let through** (3 / 2 / 1 / 0);
- **the "fewer than 3 specs" bucket by family** (with 0 / 1 / 2 specs, and how many would pass everything else at a
  minimum of 2 and of 0);
- **10 example names per bucket** (the bucket = the first criterion a product fails; spread over the list, not the first ten).

The selection and the funnel call ONE function (`failedCriteria`, `lib/seo/product-seo-batch.ts`), so they cannot
disagree; a test compares it with the old inline filter on 576 combinations. When a selection is short, its summary names
the biggest blocker.

How it looks on the local database (4,309 active products, none with stored text; the production numbers will differ):

| # | criterion | fails on its own | removed here | left |
|---|---|---|---|---|
| 0 | start | | | 4309 |
| 1 | price > 0 | 1352 | 1352 | 2957 |
| 2 | real image (not the placeholder) | 4284 | 2932 | 25 |
| 3-5 | not coming soon / real brand / usable type | 0 / 0 / 45 | 0 | 25 |
| 6 | at least 3 specs | 4032 | 20 | 5 |
| 7-12 | unique title / four gates / lengths | 460 / 0 / 0 / 208 / 0 / 242 | 0 | 5 |
| | **pass every criterion** | | | **5** |

Minimum 3 / 2 / 1 / 0 specs would pass 5 / 18 / 23 / 25. Locally the placeholder image is what removes most
products; on production it may be that, the price, or something else. **I did not change any criterion** (see the owner
decisions).

#### `--select-batch`, `--min-specs`, `--limit`, batch files

- `--select-batch[=N]` honours `--allow-few-specs` and `--min-specs=0..4` (explicit minimum wins over the flag) and
  prints "minimum specs per description: 3 (default)" / "0 (--allow-few-specs) - title + type only is enough" /
  "2 (--min-specs=2)". `--apply` and the dry run use the same minimum (`decideApply` takes it; its default-case message is unchanged).
- **A description with few specs states only what the name or the stored specs contain**: with 0 specs it is the title core,
  the neutral pointer sentence and the neutral closing; no spec is ever invented. A test runs 12 products with 0-2 specs through a claim checker
  (no claim word and no number that the name, specs or title do not contain), and the local sweep below runs it on all 4,309.
- **`--limit`** works as `--limit 20` and `--limit=20`, with `--apply` and the dry run, and the summary prints
  `--limit 20: limited to 20 of 4309`. Before, `--limit 20` (space) was read as "no limit", silently. All options now go
  through `lib/seo/apply-cli.ts`: a missing or non-numeric value, `0`, a negative or decimal number, an unknown option
  (`--limt=20`), a repeated option, a stray word or an impossible combination (`--explain-filter` with `--apply`) abort
  with a message **before the database is opened** (tested in the parser and by spawning the script).
- The old `--apply` guard had `&& !arg("only")`: `--only` did nothing else, so `--apply --only=x` skipped the
  "needs a batch file or limit" check. Removed; the guard is in the parser.
- **Batch files are never overwritten**: `--select-batch` writes `batch-<N>.csv` (+ `batch-<N>-summary.md`) with the next
  number above any existing `batch-*` file, or the file named by `--out=<file>.csv`; an existing file is refused, the
  write itself is exclusive (`wx`), and the path is printed ("wrote ..."). `--out=<dir>` keeps its old meaning.

#### Description polish (separate commit)

The spec part of a description no longer repeats what the title already says. The title takes collision extras (CPU, size,
storage, capacity); the description used to say them again.

| Product | Before (v2.2) | After (v2.3) |
|---|---|---|
| Toshiba P300 2TB (1 / 2 / 4TB set) | `Toshiba PC Hard Drive P300 2TB: 2TB, 2 TB capacity, 6.0 Gbit/s interface.` | `Toshiba PC Hard Drive P300 2TB: 6.0 Gbit/s interface.` |
| ThinkPad E14 G7 Core Ultra 5 225H | `… Core Ultra 5 225H Laptop – Core Ultra 5 225H, 16GB RAM.` | `… Core Ultra 5 225H Laptop – 16GB RAM, 512GB SSD.` |
| Smart Flairedge (title `Smart Flairedge Laptop 512GB 15.6 inch Core i5-1335U`) | `…: Core i5-1335U, 8GB RAM.` | `…: 8GB RAM.` |

Rule (`dropTitleRepeats`): a spec phrase whose words — leaving out the measuring nouns ("capacity", "storage", "display",
"memory", "socket"...), and "RAM" unless the title also names a storage kind — are all in the title core is dropped.
`2 TB` and `2TB` are one quantity. "512GB SSD" with only "512GB" in the title keeps what is new: "SSD storage". Titles,
keywords and `specsAvailable` (the selection's spec count) are unchanged, so no product enters or leaves a batch because of this.
The "Key specs of …:" lead is used only with two or more specs. The audio form factor is now taken only from the name's own
words (`Earbuds` stays "earbuds", no longer "in-ear"; "TWS" and "earphones" claim nothing).

Sweep over the 4,309 local products (read-only; v2.2 from main against v2.3 on the same inputs):

| Metric (rows) | v2.2 | v2.3 |
|---|---|---|
| description says a quantity / code twice | 251 | **4** (junk raw names that repeat themselves: a licence string, a Zebra name pasted twice) |
| "X: X" (the core repeated in the spec part) | 217 | 2 (same junk) |
| title / keyword differs from v2.2 | – | **0 / 0** |
| description differs from v2.2 | – | 354 |
| description length outside 120-155 | 83 | 83 (unchanged: gated by "valid lengths") |
| `specsAvailable` < 3 (what the selection counts) | 4032 | 4032 |
| `few_specs` flag (the description states < 3 specs) | 4043 | 4131 |
| claim or number not in the name / specs / title | 36 | **4** (all derivations, below) |
| selection, minimum 3 / 2 / 1 / 0 | 5 / 18 / 23 / 25 | 5 / 18 / 23 / 25 |

The 4 left are deterministic derivations of v2 / v2.2, not inventions: "NVMe" shown as "NVMe SSD", `2x 16GB` shown as
32GB (two rows), a PSU certification "Bronze" shown as "80 Plus Bronze".

#### Verification (2026-11-11, local)

`tsc` 0 errors; eslint clean; `next build` OK (build `J6KeXOTW3ZsFe47U7aiKZ`, separate worktree); `test:seo-product` **1,356** + **157** checks
(`check-product-seo.ts` was 1,292; the new `check-product-seo-batch.ts` is run by the same npm script); `test:seo-product-meta`
11, `test:seo` 92, `test:seo-meta` 383, `test:seo-phase5` 198, `test:seo-phase6` 59, `test:security` 27,
`seo:check-schema --offline` 49. Every v2.2 check passes; two expectations were adjusted on purpose (a title that
already says "Cat6 UTP 2m" / "Over-Ear" no longer has those specs repeated in the description).

#### Needs owner decision (Phase 8 v2.3)

1. **Run `--explain-filter` on the server first.** If the biggest blocker there is the real-image or price criterion, the
   question is whether those should gate a batch at all: the SEO text does not depend on either. They were put there to pick a
   well-formed first batch to review. Relaxing them is a one-line change per criterion; I did not make it.
2. **The 419 already generated rows keep the old text** (the selection never offers products with stored text). Re-applying
   the new wording means a batch file of their slugs: `decideApply` updates `seoSource = generated` rows without
   `--overwrite`, and still never touches hand-written ones.
3. **`--apply --limit=N` applies to the first N products by id with no quality filter** (only `--batch-file` is
   filtered; this is how v2 was built). Use a selected batch file; run the dry run with the same `--limit` first.
4. **Thin descriptions** (fewer than 2 specs) are the title core + "See full specifications on the product page." + the
   neutral closing. That pointer sentence is the v2 wording; say if you prefer to drop it (the description then needs 120+
   characters from the core, which short titles do not reach).
5. **Product names that repeat themselves** (a licence string, a Zebra name pasted twice) still produce a repeated core;
   that is the raw name's own text. 179 licence-style names are already skipped by `bad_chars`.

### Phase 8 v2.4 — claim accuracy

Branch `seo-phase-8-fix-4` (from main after PR #12, which has v2.3). Code only: no schema change, nothing run on
production. The local database was read, never written (the script's Prisma client throws on any write outside
`--apply` / `--restore`). Three commits: the accuracy fixes, the cosmetic casing change, these notes.

#### What the batch-2 dry-run found, and the cause of each

| Defect | Cause | Fix |
|---|---|---|
| "ATX form factor" on M-ATX / Micro ATX boards and cases (26 rows) | the generator's reader ended with a bare `ATX` alternative, so `M-ATX` / `mATX` matched its tail; the import script's casing reader did not know "Micro ATX" (a space) or "M-ATX" at all and fell through to ATX, and guessed ATX for any chipset code without an "M" | `lib/catalog/form-factor.ts`: Micro-ATX = M-ATX / mATX / M.ATX / MicroATX / Micro ATX / uATX, E-ATX = E-ATX / EATX / Extended ATX, Mini-ITX = Mini ITX / mITX / ITX, **a bare ATX only with no prefix**. Shared by the generator and `populate-import-attributes.ts`. The **name outranks any stored value**; a stored value is used when the name says nothing (a spec row as it is, an attribute unless it says plain ATX, which needs the name to say ATX). A name that lists several forms claims none |
| "with microphone" with no mic in the name (13 live rows of batch 1, 7 of batch 2); in-ear / Bluetooth / wired from guesses | the import script writes `audioType`, `connectivity` and `microphone` attributes by guessing from the name ("buds" -> In-ear, "headset" -> Over-ear + Microphone=Yes, 3.5mm -> Wired); v2.2 blocked the Over-ear / bare-Yes attribute shapes only, so In-ear / Bluetooth / a spec **row** "Microphone: Yes" still fed claims | claims come from the raw name, the category names or an **informative spec row** only: **attributes never back a claim**, a bare Yes / No row is not evidence, "No ANC" in a name is not support for ANC (`lib/seo/claims.ts`). A shape-agnostic net checks every claim keyword (microphone, built-in, ANC, wireless, wired, Bluetooth + version, over- / in- / on- / open-ear, earbuds, neckband) against that evidence whatever stored shape leaked it |
| "Honor 600 Pro Mobile Accessory", "6.57 inch, 6.57 inches size" | the leaf "Mobile Accessories" is not in the umbrella list, so it became the type; the `fill` rule turns any `Size: 6.57 inches` row into "6.57 inches size", and my v2.3 quantity normalisation had broken the "same first number" de-duplication ("6.57inch" vs "6.57") | a leaf that is a bucket (…Accessories / Gadgets / Components / Peripherals / Equipment) is **not a type**, and neither is its parent; the name must state one (Smartphone, Earbuds…) or the row is skipped with `unusable_type`. "size" is no longer a fill phrase; inch / inches / in / " are one unit when de-duplicating |
| "8GB size, 7680x4320 resolution" on graphics cards (26 rows) | the same fill rule: `Size: 8GB` -> "8GB size", `Resolution: 7680x4320` (the largest picture the card can drive) -> "7680x4320 resolution" | GPU memory is read as "<size> <type>" (`lib/catalog/gpu-extract.ts`): **"8GB GDDR6"** with the type from the name, "8GB VRAM" when the name gives none, never "size"; "resolution" is a phrase only for products with a display (monitor, laptop, flat panel, IP phone). A chip written in the name or a stored spec is kept in the title when the title still fits; **never derived from a SKU** (`GV-N5070GAMING`, `GV-R9060XTGAMING`, `-8GD` / `-16GD` are board codes) |

#### New gates (counted and listed in the dry run and in `apply-preview.csv`)

- **`claim_conflict`** — a form factor in the description that the raw name contradicts: row skipped. (With the name-wins
  rule above the generator cannot produce one; this is the net, like `foreign_code`.)
- **`unsupported_claim`** — a claim nothing backs is **dropped** from the text; the dry run counts the rows and lists the
  claims removed. The row is skipped (`skip: unsupported_claim: fewer than N specs once it is dropped`) **only when that
  is what left it under the minimum**; a row that was short anyway stays a plain "fewer than N specs" skip.
- **`unusable_type`** — a category that is only a bucket and a name that states no type: row skipped.
- **`bad_spec_phrase`** — "<n>GB size", "<n> inches size", "<n> inch, <n> inches", or one quantity in two spec phrases: row skipped.
- The same four are criteria of the `--explain-filter` funnel (`type` and two gate rows).

#### Refresh: rows that already have generated text

`decideApply` now answers, for a row with `seoSource = generated` in a batch file: **`update`** (the text changed) or
**`unchanged`**, or — when the new text is blocked by a gate or the minimum — **`skip: <reason> (generated text stays live)`**,
so nothing is silent. `--apply` writes only `write` and `update` rows (`rowsToWrite`; an alt-only change goes through only
with `--apply-alts`). Hand-written text (`seoSource = admin`) and text with no source are skipped without `--overwrite`;
tested, including a mixed batch where only the new and the changed row are written. The dry-run summary has a block
"Rows that already have generated text: N -> n update, n unchanged, n blocked (the OLD generated text stays live)" with the list.

#### Cosmetic (separate commit)

Plain English words that raw names SHOUT become normal words in titles and descriptions, also inside the model run:
MOTHERBOARD, CASING, KEYBOARD, GAMING, MECHANICAL, BLACK, TEMPERED, MID-TOWER -> "Mid-Tower", MICRO, COMPUTER, THERMAL,
ASSEMBLY, SUPPLY… (`PLAIN_WORDS` in `lib/seo/casing.ts`: the storefront's own shouting list plus what the sweep found).
It is a dictionary, not "every capital word": brands (MSI, UGREEN), model lines (AORUS, MORTAR, ELITE), acronyms and
standards (RGB, ARGB, ATX, DDR5, WIFI6E, PSU) and any token with a digit (a model code: `B650-PLUS`, `M-ATX`) are never touched.
The type word is the standard one: a name's or a category's "Casing" is **"Case"** (a name that has both, "Corsair CASING
Crystal Series … Case", keeps both: Casing is part of the line).

#### Before -> after (stored data shaped as the production rows are: a wrong or mis-spelt `formFactor`, guessed audio attributes, `Size` / `Resolution` rows)

| Product | v2.3 | v2.4 |
|---|---|---|
| MSI MAG B860M MORTAR WIFI … M-ATX | `… Motherboard – LGA1851 socket, ATX form factor` | `… – LGA1851 socket, Micro-ATX form factor` |
| MSI B760M GAMING PLUS WIFI 6E M-ATX | `MSI B760M GAMING PLUS Motherboard`, `ATX form factor` | `MSI B760M Gaming Plus Motherboard`, `Micro-ATX form factor` |
| MSI PRO B850M-B GEN4 AM5 M-ATX | `ATX form factor` | `Micro-ATX form factor` |
| MSI B450M-A PRO MAX II (stored `M-ATX`) | `AM4 socket, ATX form factor` | `AM4 socket, Micro-ATX form factor` (with only a plain-ATX attribute: no form-factor claim) |
| MSI MEG X870E GODLIKE … E-ATX | `E-ATX form factor` | unchanged (correct) |
| Corsair iCUE LINK 2500X RGB Micro ATX case | `… Case – ATX form factor` | `… Case – Micro-ATX form factor` |
| Edifier W600BT Wireless Headphone | `in-ear headphone with microphone` | `Edifier W600BT Wireless Headphone` (no claim; skipped at min 2) |
| Edifier Gm3 Plus TWS | `Bluetooth headphone with microphone` | no claim (skipped at min 2) |
| Edifier NeoBuds Plus … Wireless | `wireless in-ear headphone` | `wireless headphone` (the name says Wireless, not in-ear) |
| Edifier Comfo Q OWS Headphone Back | `headphone with microphone` | no claim |
| Honor Choice Earbuds X7 Lite | `earbuds with microphone` | no claim |
| HONOR 600 Pro (12+256) / HONOR X7d | `Honor 600 Pro Mobile Accessory`, `6.57 inch display, 6.57 inches size` | title without a type, **skipped: unusable_type** (the text would be `6.57 inch display` once) |
| GIGABYTE AMD # GV-R9060XTGAMING OC-8GD, GDDR6 | `8GB size, 7680x4320 resolution` | `8GB GDDR6`; no Radeon chip invented from the SKU |
| GIGABYTE Intel Arc A310 … 4G GDDR6 | `4GB size, 7680x4320` | `4GB GDDR6` (Arc A310 stays in the title) |
| GIGABYTE GeForce RTX 3050 WINDFORCE OC 6GB | `6GB size, 7680x4320 resolution` | `6GB GDDR6` (type from the name) |
| XTREME M95B MINI TOWER M-ATX BLACK CASE TEMPERED GLASS | `Xtreme M95B MINI TOWER M-ATX BLACK CASE TEMPERED GLASS` | `Xtreme M95B Mini Tower M-ATX Black Case Tempered Glass` |

#### Sweep over all 4,309 local products (read-only; v2.3 from main against v2.4 on the same inputs)

| Metric (rows) | v2.3 | v2.4 |
|---|---|---|
| form factor in the description contradicts the name (all "plain ATX" where the name says M / E / Micro) | 10 | **0** |
| a claim in the spec part that nothing backs | 15 | **0** |
| in-ear / over-ear / on-ear in the description, not in the name | 9 | 1 (the name says "In-Earphone": my check's own false positive) |
| claims removed (flag `unsupported_claim`): over-ear 78, microphone 31, in-ear 10, wired 8 | 0 | 89 rows |
| "accessory" in a title or description (phone-looking names: 5 -> 0) | 87 | 3 |
| `unusable_type` (skipped) | 0 | 94 (49 were titled "… Accessory"; the rest already had no type) |
| graphics card "size" / resolution phrase; duplicated spec phrase; `bad_spec_phrase`; `claim_conflict` | 0 | 0 (the local GPUs have no `Size` / `Resolution` rows: the fixtures cover them) |
| title differs, ignoring case | – | 119 = 49 type removed + 70 category "Casing" -> "Case" |
| keyword != title core + " price in bangladesh" | 0 | 0 |
| shouted dictionary word in a title or description (cosmetic commit) | 667 | **0** |
| rows that would be WRITTEN at minimum 3 / 2 / 0 specs | 260 / 557 / 3534 | 227 / 524 / 3496 |

The 33 rows no longer written at minimum 2: 27 "fewer than 2 specs" (boards and cases whose only form-factor evidence was a
plain-ATX attribute with no ATX in the name, the import script's default guess) and 6 `unsupported_claim` (headsets whose
over-ear / microphone existed only as attributes). Nothing is newly written. The local data has no microphone attribute rows
(production does), so the local sweep cannot show the production microphone leak; the fixtures and the shape-agnostic net do.

#### Verification (2026-11-11, local)

`tsc` 0 errors; eslint clean; `next build` OK (build `8U2xN0oioRWU3d9bbIAMA`, separate worktree); `test:seo-product` **1,635** + **162** checks
(1,356 + 157 in v2.3); `test:seo-product-meta` 11, `test:seo` 92, `test:seo-meta` 383, `test:seo-phase5` 198,
`test:seo-phase6` 59, `test:security` 27, `seo:check-schema --offline` 49. Every v2.3 check passes except four expectations
changed on purpose: GPU memory is "8GB GDDR6" (was "… VRAM"); the HS50 sample keeps its over-ear **row** and drops the
attribute-only "wired" and "built-in microphone"; a gated row that already has generated text says "(generated text stays live)".
One v2.2 assertion (no shouted brand / line word left) held backspace characters instead of `\b` and had been passing
vacuously; repaired, and it passes for real.

#### Needs owner decision (Phase 8 v2.4)

1. **Rows already live keep their text.** The 26 "ATX form factor" and the "with microphone" rows of batches 1 and 2 are
   `seoSource = generated`; refreshing them needs a batch file of their slugs, and then `update` rewrites them. A row whose new text is
   blocked (the phones in "Mobile Accessories": `unusable_type`) is **not** rewritten and its **old text, "… Mobile Accessory", stays live**; the dry run lists
   those rows. Clearing such text (back to the built-in template) is a separate step I did not add, because you asked that apply
   write only `update` rows. Say if you want a `--clear-blocked` option, or fix them by hand.
2. **Coverage cost of dropping guessed claims.** Headsets whose over-ear / microphone were only attributes, and boards / cases
   whose only form factor was a plain-ATX attribute, now carry fewer specs and fall under the minimum (33 rows at minimum 2 locally).
   Accepting the import script's chipset convention (a name with `B450M` is Micro-ATX) would restore some boards; I did not, because
   it is an inference, not what the name says. Say if you want it.
3. **Sockets still come from the chipset mapping** in the import script (`B650` -> AM5, `B450` -> AM4): a deterministic standard
   mapping, not a guess, and not in your list, so unchanged. Name-only would drop it from most boards.
4. **The wrong attributes are still in the database** (`formFactor = ATX` on Micro-ATX products, guessed `audioType` / `microphone`,
   the catalogue filters read them). The generator no longer trusts them; a one-off cleanup is yours to approve. The import
   script now writes the right form factor for new imports.
5. **A GPU chip that would push the title over 60 is left out** (a 63-character title would be a skipped row): `GV-N3050WF2OC-6GD
   GeForce RTX 3050` stays chip-less. The chip is kept whenever it is in the name's core or fits.
6. **I could not see the production data.** The microphone path is closed for every stored shape I could construct (attribute,
   key-less row, bare Yes, "Built-in", non-Yes values) and the net catches the rest; if batch 2 still shows one after re-running the
   dry run, its `unsupported_claims` column in `apply-preview.csv` names the claim and the row.

### Phase 8 v2.5 — local wording, identity that survives shortening, copied-attribute audit

Branch `seo-phase-8-fix-5` (from main after PR #13, which has v2.4). Code only: no schema change, nothing run on
production. The local database was read, never written (the script's Prisma client throws on any write outside
`--apply` / `--restore`).

#### 1. PC cases are "Casing" (this reverses v2.4)

v2.4 made "Casing" a "Case". Local shops (Star Tech, Ryans, Ultra Tech, bdstall) and our own category say **Casing**, and
people search "casing price in bangladesh". Now the type word of a **PC case** is "Casing" in the title, the description and
the keywords (keyword = title core + " price in bangladesh" is unchanged, so it says "casing"). A PC case = the case
family AND (our category "Casing", or a form factor in the name, or a tower / "PC case" / "ATX … case" in the name): a
phone case, a laptop case and every other type are not renamed. A raw "Casing" stays as written; a name that already
has "Casing" earlier ("Corsair CASING Crystal Series … Case") keeps its "Case". `pcCaseWord` replaces v2.4's `standardType`.

#### 2. Identity that survives shortening

The title is the model core plus the type word, and "Price in Bangladesh" is preferred over descriptive words, so a
2TB and a 4TB "Toshiba PC Hard Drive P300" ended up with the same title ("… P300") and RAM had no DDR type. Now, for these
families, the figure that IS the product is part of the title and **cannot be dropped**:

- **HDD / SSD**: the capacity the name states (`4TB`, `512GB`; a transfer rate such as "6 Gb/s" or a cache such as
  "256 MB" is never a capacity; two different capacities are not guessed between). "Toshiba PC Hard Drive P300 4TB".
- **RAM**: the capacity and the DDR generation (`16GB DDR5`), and the type is **"RAM"**, not the "Memory" of "Memory
  Kit". A kit "16GB (2 x 8GB)" is 16GB; its "8GB" is a module, and the kit layout (`2x8GB`) is what tells two 16GB kits apart.
  "Corsair Vengeance 16GB DDR5 RAM" (VENGEANCE / DOMINATOR are plain words and take normal case).
- **Combos**: "Combo" and, when the name has it, "Mouse and Keyboard" before it (a promotional "Combo Offer" is not a combo).
- The name's capacity and DDR generation **outrank a stored one**, so the title and the description cannot disagree.
- **Gate `identity_lost`**: if any of these is missing from the title, or cannot fit within 60 characters, the row is skipped,
  counted and listed in the dry run (and is a criterion of `--explain-filter`). A title without the capacity or the DDR type is never written.

The descriptions state what the name states: capacity (once, in the title), RPM, interface and **3.5-inch / 2.5-inch** for
drives; speed, kit layout and CAS latency for RAM. A spec phrase that is only a number ("3.5") no longer exists, and the
`bad_spec_phrase` lint flags any that appears.

#### 3. Audit: where "built-in microphone" on the Edifier Comfo Q OWS comes from

What I could establish from the code (I cannot see the production rows):

| Writer | Writes | For "Edifier Comfo Q OWS Headphone Back, No ANC, …" |
|---|---|---|
| `populate-import-attributes.ts` `extractMicrophone` | attribute `microphone` = **Yes** (never "Built-in"), only when the name has "mic" or "headset" | nothing (the name has neither); `extractAudioType` guesses `audioType = Over-ear` from "headphone" |
| bulk CSV import (`lib/catalog/bulk-csv.ts`) | no attributes, no spec rows ("Variants, colors, attributes, and spec… are not touched") | nothing |
| `prisma/seed.ts`, `scripts/deploy/*` | no microphone row | nothing |
| admin product form (`syncSpecGroups`) | whatever the form posts | **see below** |

**Finding.** The admin editor loads a product through the storefront mapper (`toEditor` -> `toProductDetail` ->
`mergeSpecGroupsWithAttributes`, `lib/data/prisma/mappers.ts`), which shows every attribute value as a spec row when the
product has none ("Specifications" group; "Attributes" group when it has some). The single-product form posts **all** its
spec groups on **every** save (`admin-product-form.tsx` -> `syncSpecGroups`). So any admin save of a product whose attributes the
import script guessed writes the guesses back as real **key-less spec rows with the same label and the same value**
("Type: Over-ear", "Form Factor: ATX", "Microphone: Yes"). The generator trusts key-less rows (a human typed them); v2.2-v2.4
therefore trusted the import script's guesses once an admin had saved the product. The local database shows it: **20
products carry rows that exactly copy their attributes** (Socket = AM5 ×6, RAM = 16GB ×5, Form factor = Micro-ATX ×4, Form
Factor = ATX ×2 ...), so it is not hypothetical.

That path cannot write "Built-in" by itself (the attribute only holds Yes / No). **The only way left in the code to get
"built-in microphone" without the name saying it is a key-less spec row whose value says "built-in"** — typed in the admin
form (or inserted outside the repository). I cannot tell which one the production Comfo row is. The next dry run names it:
`apply-preview.csv` has a new column **`claim_sources`**, e.g. `microphone <- spec row "Microphone: Built-in"`.

**Change** (the copy is a guess, so it is untrusted; a typed row is not): a key-less row **identical to an attribute of the same
product** (same label, same value, ignoring case and spaces) is dropped from the facts and from the claim evidence
(`dropMirroredRows`, `lib/seo/claims.ts`); a row whose value differs from the attribute stays. Removed claims are counted
as `unsupported_claim` as before. No importer is changed.

#### Before -> after (the real names)

| Product | v2.4 | v2.5 |
|---|---|---|
| Toshiba PC Hard Drive P300 2TB | `… P300 2TB` · `Toshiba PC Hard Drive P300 2TB` (no specs) | `… P300 2TB` · `… P300 2TB – 7200RPM, SATA, 3.5-inch` |
| Toshiba PC Hard Drive P300 4TB | same (no specs) | `… P300 4TB` · `Key specs of … P300 4TB: 5400RPM, SATA, 3.5-inch` |
| Corsair VENGEANCE 16GB DDR5 6000MT/s CL36 | `Corsair Vengeance Memory Price in Bangladesh \| Techno House` · `… Memory: 16GB, DDR5 memory` | `Corsair Vengeance 16GB DDR5 RAM Price in Bangladesh` · `… RAM: 6000MT/s, CL36 latency` |
| Corsair VENGEANCE 16GB DDR5 5600MHz (Black) | `Corsair Vengeance Black Memory` | `Corsair Vengeance 16GB DDR5 Black RAM` |
| Targus AKM610AP Wireless Mouse and Keyboard Combo | `Targus AKM610AP Wireless Mouse Keyboard` | `Targus AKM610AP Mouse and Keyboard Combo Price in Bangladesh` (the ladder drops "Wireless" before it drops the "Price in Bangladesh" suffix) |
| Edifier Comfo Q OWS (the import script's attributes copied into rows by an admin save) | `… Headphone Back – over-ear headphone` | `Edifier Comfo Q OWS Headphone Back` (no claim) |
| Edifier Comfo Q OWS (a row typed "Microphone: Built-in") | `headphone with built-in microphone` | unchanged: a typed row is the one remaining source; `claim_sources` shows it |
| Corsair 2800X RS-R ARGB White Micro-ATX PC Case | `Corsair 2800X RS-R ARGB Case` | `Corsair 2800X RS-R ARGB Casing` (+ `Micro-ATX form factor`) |
| DeepCool CK560 WH E-ATX Mid-Tower Gaming Casing | `… Gaming Case` | `… Gaming Casing` |
| Delux DW301 ATX Thermal Casing / Xtreme Xjogos XJ07 ATX Casing | `… Thermal Case` | `… Thermal Casing` |

#### Sweep over all 4,309 local products (read-only; v2.4 from main against v2.5 on the same inputs)

Local population: 221 storage, 141 RAM, 25 names with "Combo", 138 PC cases.

| Metric (rows) | v2.4 | v2.5 |
|---|---|---|
| HDD / SSD: the name states a capacity and the title lost it | 44 | **0** |
| RAM: the title lost the capacity / the DDR type | 11 / 82 | **0 / 0** |
| the name says Combo and the title lost it | 13 | 1 (a "2PACK COMBO" fan set, not a keyboard / mouse combo) |
| PC case titled "Case" (not "Casing") | 133 | 2 (a zero-width character in the name: skipped as `bad_chars`) |
| PC case titled "Casing" | 5 | 136 |
| RAM typed "Memory" in the title | 70 | 4 (the name's own type word in its core: "AORUS Memory …") |
| bare-number spec phrase | 0 | 0 |
| storage descriptions that state RPM / interface / inch | 0 | 108 |
| gate `identity_lost` (skipped) | 0 | **6** (all titles that cannot hold the capacity within 60 characters) |
| title_collision | 458 | 444 |
| title differs from v2.4, ignoring case | – | 281 |
| keyword != title core + " price in bangladesh" | 0 | 0 |
| products with a spec row that only copies an attribute (dropped) | – | 20 |

Rows that would be written at minimum 3 / 2 / 0 specs: **227 / 524 / 3496 -> 341 / 681 / 3506**. **Newly skipped: 0 / 0 /
4** (all four at minimum 0, all `identity_lost`: rows that v2.4 would have written with no capacity in the title).
**Newly written: 114 / 157 / 14**: the specs the name states (capacity, RPM, interface, speed, kit) count as specs, so drives and RAM
modules reach the minimum that they did not before. That changes what `--select-batch` offers.

#### Verification (2026-11-11, local)

`tsc` 0 errors; eslint clean on `lib` and `scripts`; `next build` OK (build `ooAyZl2DiFmiCKEVYil1F`, separate worktree); `test:seo-product`
**1,716** + **163** checks (1,635 + 162 in v2.4). Every v2.4 check passes except the ones that encode v2.4's decision and
three v2.3 description checks, changed on purpose: "Casing" is the type word (the v2.4 casing tests expected "Case"), and the
v2.3 Toshiba fixture's description now states the name's RPM / SATA / 3.5-inch
(it used to keep only the stored "6.0 Gbit/s interface" row: the stored interface row did not read, and a stored fact now blocks a
name-derived one only when it reads). The project-wide `npm run lint` still reports one error in
`features/marketing/offer-countdown.tsx`, a file this branch does not touch (identical to main).

#### Needs owner decision (Phase 8 v2.5)

1. **Fix the admin editor at the source.** Every admin save of a product whose attributes are import-script guesses turns the
   guesses into spec rows that look hand-typed (and the storefront shows them as specs). The generator now ignores copies, but
   the rows are still stored. Options: stop merging attributes into the editor's spec groups, or post only the groups the admin
   touched. That is a UI / data-flow change outside this task; I did not make it.
2. **Find the production Comfo Q OWS row.** Run the dry run on the server and read `claim_sources` for the headset rows: a
   `spec row "Microphone: Built-in"` is a row someone typed (or inserted); you can correct or delete it in the admin.
3. **Rows already live keep their text** until they are refreshed from a batch file: v2.4's "Case" titles and the RAM / drive
   titles without capacity / DDR are `update` rows for `--apply`; the refresh block of the dry run lists any row whose new text is blocked.
4. **Targus "Wireless"**: the title ladder prefers the "Price in Bangladesh" suffix over descriptive words, so "Wireless" goes
   before "Combo" is touched. Keeping "Wireless" means a title without the suffix ("Targus AKM610AP Wireless Mouse and Keyboard
   Combo", 49 characters). Say if you prefer that.
5. **The 6 `identity_lost` rows** are drives whose name is longer than 60 characters even with the capacity ("SEAGATE STLC8000400 ONE
   TOUCH HUB 8TB …", flash drives filed under "Portable Hard Disk Drive"); they need a shorter name or a hand-written title.

### Phase 7 findings — mobile performance and accessibility (measure and diagnose only)

Branch `seo-phase-7` (from main after PR #14). **Step 1 changed no code**: this section is the only change. Nothing was
run against production and no database was written (the local server only reads the dev database).

#### How it was measured (and what that can and cannot tell)

- `next build` of main (`2d705d5`) in a scratch worktree, `next start` on port 3100 started with
  `Start-Process` and checked against that build's `_buildManifest.js`; Lighthouse **13.5.0** (via `npx`, nothing added to the repo),
  Chrome 157, mobile preset, default simulated throttling (Slow 4G, 4x CPU), **3 runs per page, medians**. Run-to-run noise on this
  machine is about +-3 points, with occasional single-run outliers (identical setups scored 81 / 85 / 79, 87 / 73 / 86 and 63 / 85 / 84),
  which is why medians are used; LCP is steadier than the score.
- **Local is not production.** The local database has no analytics tag ids (so GTM / GA4 / Meta Pixel / Tawk.to never load here), almost
  every product has the placeholder image (4,284 of 4,309), and there is no nginx in front (none of the WebP-copy / cache rules from
  `deploy/nginx-seo.conf` apply). So the structural findings below (JS, fonts, CSS, HTML, accessibility, the header logo) are measured; the
  **product-image and third-party findings are not** and are marked so. The accessibility score here (87) matches production's (86).
- Controlled experiments (category page, 3 runs each, no code change): block fonts, block `_rsc` prefetches, block all JS, and serve the
  header logo at three sizes.

#### Baseline (local, medians of 3) against production's PageSpeed

| Page | Perf | LCP | TBT | CLS | A11y | LCP element |
|---|---|---|---|---|---|---|
| Home | 86 | 4.0 s | 118 ms | 0 | 97 | header search placeholder text |
| /category/laptop | 81 | 4.6 s | 164 ms | 0 | 87 | **first product-card image (180x180, at y = 768 px, just at the fold), `loading="lazy"`**, no fetchpriority; phases: TTFB 217 ms, load delay 159 ms, load 10 ms, render delay 77 ms (run 1) |
| Laptop product page | 84 | 4.4 s | 92 ms | 0 | 93 | breadcrumb text |
| Monitor product page | 84 | 4.4 s | 101 ms | 0 | 93 | breadcrumb text |
| /offers | 84 | 4.4 s | 95 ms | 0 | 96 | first offer-card image, `loading="lazy"` |
| *production, as you measured* | category 57, home 86 | category 10.3 s | category 630 ms | – | category 86, home 97 | – |

Home matches production (86). The category page does not (81 against 57): the gap is the things missing locally.

#### Controlled experiments (category page, median of 3)

| Variant | Perf | LCP | TBT | Transfer |
|---|---|---|---|---|
| baseline | 81 | 4.6 s | 164 ms | 596 KB |
| all 6 font files blocked | **91** | 3.2 s | 92 ms | 364 KB |
| all JS blocked | **93** | 3.2 s | 0 ms | 333 KB |
| `_rsc` link prefetches blocked | 83 | 4.6 s | 104 ms | 536 KB |
| header logo = original PNG (1,187 KB) | **73** (73 / 84 / 70) | **10.3 s** (10.4 / 4.5 / 10.3) | 107 ms | 1,783 KB |
| header logo = its 131 KB WebP copy | 82 | 4.7 s | 106 ms | 727 KB |
| header logo = right-sized 288 px (19 KB) | 82 | 4.4 s | 116 ms | 615 KB |

With the original PNG two of three runs reach LCP 10.3 s (the figure you saw in production) and one stays at 4.5 s: the 1.2 MB file
queues ahead of the lazy LCP image on the simulated 1.6 Mbps link. Whether production serves the PNG or a WebP copy of it depends on
whether `optimize-uploads.mjs --apply` and the nginx blocks of `deploy/nginx-seo.conf` were applied; that is not visible from here.

#### Findings, ranked (gain = estimated mobile Lighthouse points / LCP; "measured" = from the experiments above)

| # | Cause | Evidence | Pages | Est. gain | Risk | Effort | Proposed fix |
|---|---|---|---|---|---|---|---|
| 1 | **Header logo is a 1536x1024 PNG (1.19 MB) shown at 96 px high** and preloaded on every page | `public/uploads/general/fbdf9f15….png` 1536x1024, 1,187 KB (131 KB even as WebP); `<img style="height:96px;width:auto">` x3 (header, mobile header, lazy footer) + `<link rel="preload" as="image">` on every page; the custom loader returns `/uploads/*` as is, so no resizing | all | measured: 73 -> 82, LCP 10.3 -> 4.4 s, -1.17 MB (if production serves the original); 131 KB -> 19 KB: ~0-3 pts, -112 KB | low (same picture at 2x; keep 3x for 432 px) | S | replace the logo asset with a right-sized file (about 432 px wide WebP / PNG, <= 30 KB) in Admin -> branding (data change, no code) and/or render it through `next/image` with real width/height; keep or drop the preload |
| 2 | **Listing images are delivered at stored size, and the first row is lazy** (production only) | the loader returns `/uploads/*` unchanged for every `srcset` width, so all candidates are the same URL; cards show ~180-206 CSS px but fetch the stored file (<= 1000 px / <= 80 KB if converted, the original up to 5 MB if not); `lcp-discovery` fails on category and offers (`fetchpriority` no, `loading=lazy` yes); 21 cards | category, home, offers, brand, search | **not measurable locally** (placeholder SVG). At ~60-80 KB per image the 8-10 images near the fold are 0.5-0.8 MB = 2.5-4 s of the simulated link | low-medium | M | (a) `priority` on the first row of cards (2-4); (b) generate small WebP derivatives (e.g. 240 / 480 px) next to uploads and let the loader pick by width (sharp is already a dependency; nginx rule); needs one production check first (see questions) |
| 3 | **Fonts: 6 files, 232 KB on every page, 107 KB of it for the taka sign** | four families loaded in the root layout: Plus Jakarta Sans (28 KB), Inter (49), IBM Plex Mono 400 + 500 (22), Noto Sans Bengali latin (26) and **Noto Sans Bengali bengali subset (107 KB)**, requested on every page because "৳" (U+09F3) is in its unicode-range; no preload, discovered from CSS | all | measured: 81 -> 91, LCP 4.6 -> 3.2 s, TBT -70 ms (all fonts). Realistic: dropping the 107 + 26 KB Bengali files = 57% of font bytes, ~ +5-6 pts | medium (glyph shapes must not change) | M | serve "৳" from a tiny (about 2 KB) subset of the same Noto glyph instead of the 107 KB file; load the Bengali / mono / Inter files only where a theme or page uses them (Design Studio can switch the body font); keep `swap` |
| 4 | **Third-party scripts** (production only) | GTM, GA4, Meta Pixel and Tawk.to are injected `afterInteractive` from `AnalyticsConfiguration` (`components/analytics/storefront-analytics.tsx`, chat widget); none load locally. Production category TBT 630 ms against 164 ms locally: ~470 ms is unexplained by anything measured here | all | **not measurable locally**; likely the largest part of the TBT gap | medium (tracking: needs your decision, nothing is removed) | S-M | after a production trace: load the chat widget on interaction / idle (`lazyOnload`), defer GTM past `load`, avoid loading GA4 twice if it is also inside GTM |
| 5 | **JavaScript: 600 KB raw / 200 KB gz in 13 files on every route; 46% of it executed on load** | framework (react-dom + app router + flight client) ~384 KB raw; the project's 38 client modules on the category route ~190 KB raw (header search / cart / account / mobile nav / mega-nav, footer newsletter and CTA, tracking bootstrap, popup, site alert, sale-alert toast, jump-up effects, feedback provider, and 2 islands per product card x 21); main thread: script evaluation 635 ms + style/layout 428 ms (4x CPU); hydration long tasks 157 + 54 ms | all | measured upper bound (no JS at all): 81 -> 93, TBT -164 ms. Realistic: -60-80 KB raw, +3-4 pts, TBT -50-80 ms | medium (popup / toast timing) | M-L | defer the non-critical layout islands (popup, site alert, sale toast, jump-up, newsletter, tracking) behind `dynamic()` after idle; one delegated client component for card actions instead of 2 per card; framework bytes cannot shrink |
| 6 | **`<Link>` prefetch of every visible product link** | 27 `_rsc` requests / 60 KB on the category page, the first 541 ms after the document | category, home, listings | measured: 81 -> 83, TBT -60 ms, -60 KB | low (a card -> product click is slightly slower) | S | `prefetch={false}` on product-card links (prefetch on hover / touch is the alternative) |
| 7 | **Two render-blocking stylesheets** | 169 KB raw (26 KB gz) + 22 KB raw (4 KB gz, the font-face CSS); coverage on the first screen: the big one is 91% used (not bloat), the small one 10%; Lighthouse: FCP -230 to -410 ms | all | ~ +1-3 pts | medium (HTML grows ~26 KB gz, CSS no longer cached across pages) | S | `experimental.inlineCss`, or inline only the small font CSS; measure before keeping |
| 8 | **Large HTML with the whole RSC payload inline** | category 384 KB raw / 63 KB gz, of which ~150 KB is inline flight data (every card's product props); home 533 KB / 95 KB gz (230 KB of flight data) | category, home | ~ +1 pt, -30 KB gz | low | M | pass only the fields the client islands use; do not serialise card data twice |
| 9 | **Every page is rendered per request, no HTML caching** | `Cache-Control: private, no-cache, no-store` (the storefront layout reads the customer cookie); ~10 awaited reads in the layout; local TTFB 100-470 ms (first hit 1.2 s) | all | -50-200 ms TTFB (production TTFB not known) | medium | M | cache the layout's configuration reads (`unstable_cache` / revalidate); only after production TTFB is known |
| 10 | **Legacy-JS polyfills in the main chunk** | Lighthouse: 14 KB wasted, LCP -100-150 ms (estimate); the 110 KB `nomodule` polyfill file is not downloaded by modern Chrome | all | small | medium (older Android WebViews) | S | leave unless the browser support target is raised |
| 11 | **Public assets have no long cache** | `/products/placeholder.svg` (and `/brands/*`, `/home/*`) are sent `public, max-age=0` by Node; only `/_next/static` (1 year, immutable) and `/uploads` (nginx, 30 days) are long-cached | repeat visits | none on a first load | low | S | `headers()` in `next.config.ts` or an nginx rule for those folders |

**CLS** is 0.000 on all five pages in all 33 local runs (cards use `aspect-[4/3]`, the logo box is fixed): no CLS work is proposed;
production CLS is not known (the logo is `width:auto` and would only shift if a slow logo changed the header width).
**TBT** is already under 200 ms locally (medians 92-164 ms); the production overage is the third-party and JS items.
**LCP <= 2.5 s is not reachable by one fix**: with either all fonts or all JS removed, the category LCP is still 3.2 s here (HTML 62 KB gz
+ blocking CSS + the lazy LCP image on the simulated link). It needs items 1, 2, 3, 6 and 7 together and probably a smaller HTML document;
**Performance >= 85 on category and product pages looks reachable** (1 + 3 + 6 alone is ~ +15 on the experiments' numbers).

#### Accessibility: every failing audit, with selectors (Lighthouse, 3 runs per page, union)

| Page (score) | Audit (weight) | Element / selector | Source | Fix (no visual change) |
|---|---|---|---|---|
| category (87) | `aria-allowed-attr` (10) | `nav.mt-5 > ul.flex > li > a.inline-flex` has `aria-pressed="false"` on a link | `features/catalog/category-brand-pills.tsx:43` | use `aria-current` (or drop `aria-pressed`) on the link |
| category (87) | `color-contrast` (7) | `div.min-w-0 > div.mt-8 > nav.flex > span.th-btn`: #7d8a9a on #f4f7fb = **3.27:1** (needs 4.5) | `components/ui/pagination.tsx` (disabled / current ghost button) | darken the disabled-state text token to >= 4.5:1 |
| category (87) | `heading-order` (3) | `article.group > div.flex > a > h3.line-clamp-2` (h3 follows h1 with no h2) | `features/catalog/product-card.tsx` (and the compact card) | render the card title as `h2` in listings, same classes |
| all five | `target-size` (7) | footer `div.space-y-4 > p.flex > span.space-y-1 > a.block` (the two phone links): 179.5 x **19.6 px**, 23.2 px of free space (needs 24) | `components/layout/site-footer.tsx:326` | `min-h-6` + vertical centring (a few px of footer height) |
| home (97) | `target-size` (7) | `div.mx-auto > div.relative > div.absolute > button.h-1.5` (hero dots, 2-3 of them): 10 x **6 px**, 6 px of free space around each (needs 24) | `features/home/home-hero-slider.tsx:153` | enlarge the hit area with padding / a transparent border, same dot |
| laptop and monitor (93) | `aria-required-children` (10) | `div.grid > div.mt-10 > section > div.flex.flex-wrap.gap-2[role="list"]` holds `button`s, not `listitem`s | `features/product/product-detail-sections.tsx:118` | drop `role="list"` (it is a tab-like button row) or wrap in `<ul>/<li>` |
| laptop and monitor (93) | `label-content-name-mismatch` (0) | `figure.w-full > div.relative > div.relative > button.group[aria-label="View full image 1 of 1"]` | `features/product/product-gallery.tsx` | informational (weight 0) |
| offers (96) | `label-content-name-mismatch` (0) | `div.mx-auto > ul.mt-8 > li.min-w-0 > a.group[aria-label="View details for …"]` | offers card | informational (weight 0) |

The four category fixes add up to weight 27 of the failing set: **category 87 -> about 100**; product pages 93 -> about 100 with the list-role and
tap-target fixes. Best Practices (96) fails only `errors-in-console` here, caused by the local 404s of `/uploads/*` (a local-setup artefact). SEO is 100 on every page.

#### What I could not measure, and the question that follows

1. **Production image delivery** (item 2) and **third-party cost** (item 4): the local data and missing tags hide them. One read-only pass against the
   public site would settle both: Lighthouse on `/category/laptop` (it fires the live analytics tags and the Pixel's PageView, as PageSpeed does) and
   a few `curl -I` calls on a logo / product image (WebP copy served? cache headers?). I have not touched production; this needs your go-ahead.
   Alternatively paste PageSpeed's "Opportunities / Diagnostics" for the category page.
2. **Is the nginx WebP / cache block of Phase 4 live, and was `optimize-uploads.mjs --apply` run?** If yes, the logo is the 131 KB copy and item 1 is
   worth about 0-3 points; if no, it is the single biggest fix (LCP 10.3 s in the experiment).

#### Scratch artefacts (not in the repo)

The scratch worktree `...\scratchpad\wt6` was used for the builds; it now holds the logo test file under `public/uploads` and a build made with it. It has a
`node_modules` junction, so I left it in place for you to remove. Lighthouse reports and scripts are under `...\scratchpad\p7`.

## 3. Manual actions for the operator

(Updated as phases complete.)

- **Phase 1 — nginx (optional but recommended):** the app alone now 301s
  www → apex after deploy, but doing it in nginx saves a proxy hop. Merge the
  blocks from `deploy/nginx-seo.conf` into the live site file
  (`/etc/nginx/sites-available/…`), then `sudo nginx -t && sudo systemctl reload nginx`.
  Check first that the certificate covers www: `sudo certbot certificates`.
- **Phase 1 — deploy:** no schema change:
  `cd ~/techno-house && git pull origin main && npm run build && pm2 restart techno-house`
  (after the branch is merged).
- **Phase 1 — Search Console:** submit `https://technohouse.com.bd/sitemap.xml`
  again (it is now an index); remove any `www` property's sitemap if one was
  submitted.
- **Phase 2 — deploy:** no schema change, same command as Phase 1.
- **Phase 2 — optional read-only check on the server** (prints duplicate
  titles against the real catalogue, writes nothing to the DB):
  `npm run seo:audit-meta` (add `-- --csv=~/seo-titles.csv` for every row).
- **Phase 2 — content:** the about/contact/faq/warranty/shipping/returns/terms/
  privacy pages are still placeholder text on the live site; their new
  descriptions are only as good as the page behind them. Fill them in Admin →
  Design Studio → Pages.
- **Phase 3 — deploy:** no schema change, same command as Phase 1. Then
  validate the live site (read-only): `npm run seo:check-schema --
  --base=https://technohouse.com.bd --products=40`, and test one product in
  Google's Rich Results Test (https://search.google.com/test/rich-results).
- **Phase 3 — shipping/returns:** done in Phase 6 for `shippingDetails`
  (delivery times). `hasMerchantReturnPolicy` is built but switched off
  (`MERCHANT_RETURN_POLICY_MARKUP` in `lib/site/policies.ts`; see Phase 6).
- **Phase 3 — shop opening hours:** not in the schema yet. When the real shop
  hours and days are confirmed (separate from the 9:00–22:00 support hours),
  they can be added as `openingHoursSpecification`.
- **Phase 4 — deploy:** `package-lock.json` changed (sharp pinned, svgo), so
  `npm ci` is needed: `cd ~/techno-house && git pull origin main && npm ci &&
  npm run build && pm2 restart techno-house`.
- **Phase 4 — convert existing uploads** (run as the deploy user, never sudo,
  so the copies keep the same owner): dry run first —
  `node scripts/optimize-uploads.mjs --csv=$HOME/webp-dryrun.csv | tail -8`,
  then one folder — `node scripts/optimize-uploads.mjs --dir=public/uploads/general --apply`,
  then everything — `nice -n 19 node scripts/optimize-uploads.mjs --apply | tail -8`.
  SVG: `node scripts/optimize-svg.mjs --dir=public/uploads/general --embedded-webp`
  then the same with `--apply`, and open the `.min.svg` once in a browser.
- **Phase 4 — nginx:** the steps in `deploy/nginx-seo.conf` (phase 4 part).
  Until they are applied, the WebP copies exist but are not served.
- **Phase 4 — re-measure after deploy**: `node scripts/perf/measure-pages.mjs
  --base=https://technohouse.com.bd --throttle --profiles=mobile` (from a PC
  with Chrome).
- **Phase 6 — deploy + seed:** no schema change, same deploy command as
  Phase 1. Deploying alone changes nothing visible; publish the eight pages
  with the seed (dry run first) — see "Phase 6 → To publish". Once /returns
  and /shipping are seeded, product offers carry the return policy and
  delivery times automatically (supersedes the Phase 3 shipping/returns note
  and the Phase 2 "content" note).
- **Phase 2 — data:** duplicate product listings (same product entered twice
  with a location tag or a project note) keep identical titles; merge or
  deactivate them in Admin → Products (the audit lists them).

## 4. Keyword-map slugs not found

Checked against the live sitemap (production DB) and the dev DB, 2026-11-09.

| Keyword-map entry | Result |
|---|---|
| `ram (verify)` | **No `ram` category.** Live has `ram-desktop`, `ram-laptop`, `laptop-ram`, `server-ram`. The "ram price in bangladesh" keyword is used on `ram-desktop`. Nothing created. |
| `/category/nvme-ssd` | Exists live; missing on the dev DB only (keyword copy still applies on live). |
| `earphone/headphone (verify)` | Split: primary "earbuds" → `earbuds`, secondary "gaming headphone" → `headphone` (both exist). |
| `keyboard/mouse (verify)` | Split: `keyboard` and `mouse` (both exist). |
| `smart watch`, `monitor`, `processor`, `graphics card`, `motherboard`, `power supply`, `casing`, `cpu cooler`, `UPS` (verify) | All exist: `smart-watch`, `monitor`, `processor`, `graphics-card`, `motherboard`, `power-supply`, `casing`, `cpu-cooler`, `ups`. |
| Brands (verify): hp, lenovo, dell, acer, msi, gigabyte, apple, amd, corsair, epson | All exist on live with exactly these slugs. |

Keyword-map headings deliberately broader than the bare keyword (so the title
matches what the page lists): networking "Router & Networking", security
"CC Camera & Security", camera "DSLR & Camera", tv "TV & Smart TV", appliance
"AC & Home Appliance", software "Windows 11 Pro & Software", gaming "Gaming
Accessories", keyboard/mouse keep "Keyboard"/"Mouse" in the title with
"gaming keyboard/mouse price in BD" in the description. "used vs new laptop
bd" (laptop secondary) was not used — it is a comparison/informational query
that fits a blog post (Phase 5) better than a category description.
