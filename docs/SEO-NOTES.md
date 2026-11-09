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

## 4. Keyword-map slugs not found

(Filled in Phase 2.)
