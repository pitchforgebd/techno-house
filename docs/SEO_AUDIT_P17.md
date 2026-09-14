# SEO audit — Phase 17 (P17-T06)

**Date:** 2026-09-05  
**Scope:** Metadata, robots, sitemap, indexing boundaries, and basic
Open Graph defaults — against `docs/DATABASE.md` (P15-T08) and
`docs/INFORMATION_ARCHITECTURE.md`.  
**Out of scope here:** Final regression → **P17-T07**; live Search
Console / production APP_URL verification → Phase 18.

## Method

- Review `app/robots.ts`, `app/sitemap.ts`, `lib/seo/*`, storefront
  `generateMetadata`, and private-route indexing
- Automated baseline: `npm run test:seo`

## Summary

| Severity | Count | Notes |
| --- | --- | --- |
| Critical | 0 | — |
| High | 1 | Cart/wishlist/compare/search were indexable (fixed) |
| Medium | 2 | PDP lacked description/OG (fixed); no metadataBase (fixed) |
| Low | 2 | Per-path SEO rows unused; product limit 500 |

**Verdict:** Global SEO config, sitemap, and admin/account noindex were
already in place. Utility surfaces (cart, lists, search) could still be
indexed; those are now blocked in robots + meta. Product pages and
storefront defaults gained description / Open Graph; root sets
`metadataBase` from `APP_URL`.

## Findings

### Pass

- **Global SEO** from `SEOConfiguration` (`path = null`) with safe
  field limits; mock mode refuses writes
- **Sitemap** lists static marketing/legal paths plus active
  categories/brands/products and published posts (capped)
- **Robots** already disallowed `/admin/`, `/account/`, `/dev/`,
  `/checkout/` and pointed at sitemap via `publicOrigin()`
- **Layouts** for admin, account, and `/dev` set `robots: noindex`
- **Auth pages** (login/register/forgot) and PC Builder share links are
  noindex
- **Blog posts** use seoTitle / seoDescription / excerpt
- **Category pages** set title + description from category content

### High (fixed)

1. **Cart, wishlist, compare, and search were crawlable/indexable**  
   Not in sitemap, but robots allowed them and pages lacked `noindex`.
   Risk of thin/personal URL noise in the index. Fixed: robots disallow
   + page-level `NO_INDEX`; checkout / payment return also meta-noindex.

### Medium (fixed)

1. **Product metadata was title-only**  
   Now uses overview line (fallback brand/warranty) plus Open Graph
   title/description/image.

2. **No `metadataBase`**  
   Absolute OG/canonical resolution depended on request host. Root
   layout now sets `metadataBase` from `publicOrigin()` (`APP_URL`).

### Low

1. **Per-path SEO rows / OG image media** remain unused (by design in
   P15-T08). Staff can edit global title/description/keywords only.

2. **Sitemap product crawl capped at 500**  
   Acceptable for current catalogue; pagination / sitemap index needed
   at larger scale (already noted in query audit).

## Fixes shipped in P17-T06

- `app/robots.ts` — disallow cart/wishlist/compare/search
- `lib/seo/robots.ts` — shared `NO_INDEX`
- Cart, wishlist, compare, search, checkout, payment return — noindex
- `app/layout.tsx` — `metadataBase`
- Storefront layout — Open Graph / Twitter defaults
- Product (+ brand description) metadata enrichment
- `scripts/seo/check-baseline.ts` + `npm run test:seo`

## Deferred

| Item | Owner |
| --- | --- |
| Per-path SEO + OG image media | future merchandising |
| Sitemap index beyond PRODUCT_LIMIT | scale |
| Live GSC / production APP_URL check | Phase 18 |
| Final regression | P17-T07 (done — see REGRESSION_P17.md) |

## How to re-run

```bash
npm run test:seo
```
