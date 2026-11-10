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

### Phase 6 — Trust pages (STOPPED after step 1, awaiting owner decision)

Branch `seo-phase-6-pages` (from main at e022d95). Source text:
`docs/SITE-PAGES-CONTENT.md` (untracked; not committed by this step).

#### Finding (step 1)

The eight routes (/about, /contact, /faq, /warranty, /shipping, /returns,
/terms, /privacy) are **DB-managed**, not static placeholders. Each
`app/(storefront)/<slug>/page.tsx` renders `StorefrontContentPage`
(`features/content/storefront-content-page.tsx`), which reads the
`ContentPage` row for that slug (`lib/content/pages.ts`,
`getStorefrontContentPage`) — the same rows staff edit in Admin → Design
Studio → Pages (`/admin/design-studio/pages`). The body is sanitized HTML
(`sanitizeBlogBody`, allowlist includes h2–h4, lists, links, tables; 20,000
character limit) and is rendered inside `.th-rich-text`. Only when a row is
missing or its body is empty does the page fall back to the hard-coded
`ContentStub` ("Our story will appear here…") — that is what the live site
shows today, so on production these rows are absent or empty. Meta title and
meta description already come from the row's `metaTitle` / `metaDescription`
when set (phase 2, `storefrontContentMetadata`), and the canonical is already
self-referencing.

Per the phase-6 rules, the content is therefore **not** duplicated into
`content/pages/*.md`; the right path is to put it into those `ContentPage`
rows with a seed script, so Admin → Pages stays the one place to edit it.

#### Proposed seed script — `scripts/seed-trust-pages.mjs` (not written yet)

Same safety model as `scripts/fix-catalog-text.mjs`; run with tsx.

    npx tsx scripts/seed-trust-pages.mjs                     # DRY RUN (default)
    npx tsx scripts/seed-trust-pages.mjs --apply --confirm-db=<db name>
    npx tsx scripts/seed-trust-pages.mjs --apply --only=faq,terms --confirm-db=<db name>
    npx tsx scripts/seed-trust-pages.mjs --restore=<backup.json> --confirm-db=<db name>

- **Input**: `docs/SITE-PAGES-CONTENT.md` (committed alongside the script, so
  the server runs exactly the reviewed text). For each "# PAGE n" block it
  reads Route, Meta title, Meta description and the body. Wording is never
  altered; the script only converts Markdown to HTML.
- **Mapping**: the page's `## …` heading → `ContentPage.title` (the page's
  single H1); `### …` → `<h2>`; FAQ group headings → `<h2>` and each **bold
  question** → `<h3>` with its answer as `<p>` (h1 > h2 > h3); tables → `<table>`
  (allowed by the sanitizer); lists, bold and `[text](/path)` links as-is.
  Instruction lines in the source such as "(Render each Q/A below…)" are
  skipped. `[Open in Google Maps]` becomes a link to the business-settings
  Google Maps URL (the same short link used as `hasMap` in the
  ElectronicsStore JSON-LD).
- **Policy values**: every value from section 0 that appears in the text is
  stored as a token (e.g. `{{phoneRma}}`, `{{refundWorkingDays}}`), so
  `lib/site/policies.ts` stays the single source. A small render-time step in
  `StorefrontContentPage` replaces the tokens. The script refuses to run if a
  value in the text does not match `policies.ts` exactly, or if a token would
  be left unresolved. (Staff editing a page in Admin will see the tokens; that
  is documented on the admin page.)
- **Dry run**: prints, per page, whether the row exists, current vs new
  title/meta/body length, and writes `docs/seo-reports/trust-pages/<slug>.html`
  previews plus a summary — nothing is changed.
- **--apply**: requires `--confirm-db=<the DATABASE_URL database name>`;
  first writes a JSON backup of the eight rows exactly as they are (including
  "row did not exist") to `docs/seo-reports/backups/trust-pages-<time>.json`,
  then upserts `title`, `body`, `metaTitle`, `metaDescription` for those slugs
  in one transaction. A row whose body is non-empty and differs from what the
  script would write is skipped unless `--overwrite` is given (so an admin's
  later edits are never replaced silently).
- **--restore**: puts the backed-up values back (and deletes rows that did
  not exist before), also behind `--confirm-db`.
- Never touches any other table, `digital-commerce-guideline` or `support`.

The code-only parts of phase 6 do not depend on this decision and can be built
once it is approved: `lib/site/policies.ts`; the render-time token step;
BreadcrumbList on all eight, AboutPage on /about, ContactPage on /contact,
FAQPage on /faq (built from the stored Q/A HTML, so it always equals the page);
"Last updated" on /terms and /privacy (it is part of the stored text);
contactPoint from `policies.ts`; `hasMerchantReturnPolicy` and
`shippingDetails` on the Product offer; `scripts/seo/check-phase6.ts`.
The eight URLs are already in `sitemap-pages.xml` (phase 1); footer/header
links will be checked during the build.

#### Needs owner decision (found so far)

1. **Approach**: approve seeding the `ContentPage` rows (above), or say if you
   would rather move these eight pages to files and drop them from Admin →
   Pages.
2. **Footer second number** shows "0 1410-305338" with a stray space. It comes
   from Admin → Business Settings (`SiteSettings`, read by
   `getStorefrontBranding`), not from code — correct it there. The phase-6 code
   will read contact numbers for the schema from `policies.ts`, not from that
   field.
3. **"We send an SMS when your order is handed to the delivery team"**
   (/shipping, /track text): the code sends an order-confirmation SMS
   (`lib/orders/order-confirmation-sms.ts`); no dispatch/hand-over SMS was
   found. Keep the sentence only if it is done manually or by the courier.
4. **"Sign in or create an account"** (FAQ, "How do I place an order?"): the
   checkout page itself does not require a session; confirm whether guest
   checkout is allowed before publishing that answer.
5. **shippingRate** will be omitted from `shippingDetails`: delivery cost is
   computed from zone and weight (`lib/shipping/zone-rates.ts`,
   `product-weights.ts`), as the /shipping text also says.
6. **Policy numbers** (24 h, 3 days, 7 working days, 1–3 / 2–7 / 1–2 working
   days) are marked in the source as "proposed defaults … the owner must
   approve them before launch". They will be published exactly as written once
   you confirm them.

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
- **Phase 3 — shipping/returns:** once `/shipping` and `/returns` state real
  delivery charges/times and a return window, `shippingDetails` and
  `hasMerchantReturnPolicy` can be added from them (ask for it).
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
