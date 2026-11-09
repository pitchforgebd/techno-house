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
