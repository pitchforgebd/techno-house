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
