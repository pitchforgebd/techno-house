# Techno House — Performance

Updated: 2026-09-05  
Task: P17-T04 (was P17-T03 / P0-T07)

## Goals

- fast first render
- fast route transitions
- small client bundles
- optimized images
- efficient queries (from Phase 10)
- stable layout
- scalable catalog browsing

## Phase 17 audits

- **P17-T03** query/N+1 — `docs/QUERY_PERFORMANCE_AUDIT_P17.md` /
  `npm run test:queries`
- **P17-T04** bundle/image — `docs/BUNDLE_IMAGE_AUDIT_P17.md` /
  `npm run test:bundle` (gallery padding no longer cache-busts)

## Baseline rules

- Server Components by default
- Client Components only when needed
- paginate large datasets
- server-efficient filtering/sorting (URL query → repository)
- avoid N+1 queries (Phase 10+)
- optimize images (`next/image` or equivalent when app exists)
- avoid unnecessary global state
- lazy-load non-critical features (admin charts, heavy builders)
- cache/revalidate deliberately
- monitor bundle growth
- no animation that blocks interaction or causes layout thrash

## Catalog

Never send the entire product catalog to the browser.

Mock repository in frontend phases must still **paginate** and filter in the data layer so swapping PostgreSQL does not require a UI rewrite.

Facet metadata can be a compact list of values + counts, not every product.

## Product page

Prioritize: gallery, title, price, stock, primary CTA.

Defer: long reviews, Q&A, related carousels (stream or lazy).

Reserve image aspect ratio to avoid CLS.

## Search and filters

- Debounce client search input; submit still uses URL
- Do not download all SKUs to filter locally
- Category pages should not ship unused facet dictionaries for other categories

## PC Builder

Fetch relevant candidates only (per slot + current constraints).

Compatibility engine runs on small candidate sets, not the full catalog.

## Admin

- Tables paginated
- Dashboard charts code-split
- Default date range limited

## Images and fonts

- Self-host or next/font for Plus Jakarta Sans / IBM Plex Mono
- No unbounded third-party script tags in frontend phases
- GA4/GTM/Meta only when Phase 15 is approved

## Measurement

Use production-relevant metrics (LCP, INP, CLS, TTFB) rather than assumptions.

No performance budget number is locked until a real Next.js build exists (Phase 01). Working targets to revisit then:

- LCP < 2.5s on typical catalog page (broadband)
- JS on storefront listing: minimize client islands
