# Bundle / image audit — Phase 17 (P17-T04)

**Date:** 2026-09-05  
**Scope:** Client bundle weight, `next/image` usage, fonts, and image
cache behavior — against `docs/PERFORMANCE.md`.  
**Out of scope here:** Accessibility → **P17-T05**; SEO → **P17-T06**;
live LCP/INP budgets → Phase 18.

## Method

- Review storefront/admin image usage, `next/font`, root providers, and
  dependency weight
- Scan Client Components for value-imports of data repositories
- Automated baseline: `npm run test:bundle`

## Summary

| Severity | Count | Notes |
| --- | --- | --- |
| Critical | 0 | — |
| High | 0 | — |
| Medium | 2 | Gallery padding weight (fixed); no `next/dynamic` splits |
| Low | 3 | Admin raw `<img>` previews; toast at root; nav product sample |

**Verdict:** Storefront product/hero imagery uses `next/image` with
`sizes` and aspect reserves. Fonts are self-hosted via `next/font`.
No chart/editor mega-deps. No Client Component pulls Prisma/`pg` via
repository value imports. One image-cache bust on PDP gallery padding
was fixed in this task.

## Findings

### Pass

- **Fonts:** `app/layout.tsx` uses `Plus_Jakarta_Sans` + `IBM_Plex_Mono`
  with `display: "swap"` — no Google Fonts stylesheet tags
- **Images:** Product cards, PDP gallery, hero slider, banners, cart,
  compare, PC Builder cards use `next/image` with `sizes`; cards reserve
  `aspect-square`
- **LCP candidates:** Hero first slide and PDP primary image set
  `priority`
- **Remote host:** `next.config.ts` allows `images.unsplash.com`
- **Server externals:** `pg`, `@prisma/adapter-pg`, `@node-rs/argon2`
  stay out of the browser bundle
- **Deps:** No `recharts` / Chart.js / Monaco / TipTap; admin charts are
  inline SVG; icons are named `lucide-react` imports
- **Client/data boundary:** No `"use client"` file value-imports
  repositories or `mockProducts`
- **Brand SVGs:** Local `/brands/*.svg` use `unoptimized` (appropriate)

### Medium

1. **PDP gallery padding busted the image cache (fixed)**  
   `buildProductGalleryImages` padded to six slides by appending `?th=N`
   / `&th=N`, forcing duplicate optimizer/CDN fetches of the same photo.
   Padding now reuses the source `src` and keeps distinct alts.

2. **No `next/dynamic` code-splits**  
   PERFORMANCE suggests lazy-loading heavy builders/admin charts.
   Admin charts are light SVG. PC Builder is already route-isolated.
   Explicit `dynamic()` splits remain optional polish, not launch-blocking.

### Low

1. **Admin flash-sale / product-form previews use raw `<img>`**  
   Mock/local previews only; Meta Pixel noscript tracker also uses
   `<img>` by design. Not storefront LCP.

2. **`FeedbackProvider` (react-toastify) wraps the root layout**  
   Toast CSS/JS is available on every route. Acceptable until a thinner
   notify path is designed.

3. **Category nav samples products to build brand chips**  
   Server-side; serialized mega-menu props are modest at current catalog
   size. Larger catalogs may need a dedicated brand-by-category query
   (related to query work, not JS payload).

## Fixes shipped in P17-T04

- `lib/product/gallery-images.ts` — stop cache-busting padded gallery URLs
- `scripts/perf/check-bundle.ts` + `npm run test:bundle`

## Deferred

| Item | Owner |
| --- | --- |
| `next/dynamic` for optional heavy islands | future polish |
| Live LCP/INP/CLS budgets on production URL | Phase 18 |
| Accessibility audit | P17-T05 (done — see ACCESSIBILITY_AUDIT_P17.md) |
| SEO audit | P17-T06 |
| Production media host `remotePatterns` | when real CDN is chosen |

## How to re-run

```bash
npm run test:bundle
```
