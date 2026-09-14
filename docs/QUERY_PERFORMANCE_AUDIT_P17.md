# Query / performance audit — Phase 17 (P17-T03)

**Date:** 2026-09-05  
**Scope:** Database query patterns, listing pagination, N+1 hotspots, and
index coverage for storefront/admin data paths — against
`docs/PERFORMANCE.md` and `docs/ARCHITECTURE.md`.  
**Out of scope here:** Client bundle / image weight → **P17-T04**.

## Method

- Review Prisma repositories, sitemap, cart/list loaders, and schema indexes
- Search for sequential `await` in loops over catalog entities
- Automated baseline: `npm run test:queries`

## Summary

| Severity | Count | Notes |
| --- | --- | --- |
| Critical | 0 | — |
| High | 0 | — |
| Medium | 2 | Discount sort full scan; related-product order |
| Low | 2 | Admin mock review path; category tree load |

**Verdict:** Storefront catalog listing is paginated and index-backed.
Cart already batched by slug. Wishlist/compare N+1 fixed in this task.
No launch-blocking query defects found at current catalogue scale.

## Findings

### Pass

- **Listing:** `productRepository.list` caps page size (`MAX_PAGE_SIZE` 48),
  uses `SUMMARY_SELECT`, filters/sorts in SQL with `skip`/`take`
- **Indexes:** `Product` has `(isActive, position)`, `(isActive, publishedAt)`,
  `categoryId`, `brandId`, `priceAmount`, `builderSlot`; reviews indexed by
  `(productId, status)`
- **PC Builder:** slot candidates capped (`MAX_SLOT_CANDIDATES` 48);
  compatibility uses batched slug loads (ARCHITECTURE note)
- **Cart:** `loadCartProducts` uses `listBySlugs` (single query)
- **Sitemap:** product/taxonomy/post crawls are capped (`PRODUCT_LIMIT` 500)
- **Admin reviews (DB):** `listAdminReviewSummaries` uses `groupBy`, not
  per-product review fetches

### Medium

1. **Discount sort loads all matching product ids into memory**  
   `listByDiscount` cannot express `compareAt - price` in Prisma orderBy.
   Acceptable at seed scale (~25–few hundred SKUs). A stored discount
   column (or generated column) is the scale path — already noted in code.

2. **Related products have no `position` on the link table**  
   Already a pending product decision; catalogue order is used. Not a
   query bug; merchandising order remains deferred.

### Low

1. **Mock admin review hub** (`buildSummaries` without DB) still loops
   `listReviewsByProductSlug` per product. DB path is fine; mock path is
   local-only.

2. **Category tree** loads all category rows to expand descendants for
   parent listings. Tree is small; recursive CTE optional later.

## Fixes shipped in P17-T03

- `features/lists/actions.ts` — wishlist/compare uses `listBySlugs`
  (same pattern as cart)
- `scripts/perf/check-queries.ts` + `npm run test:queries`

## Deferred

| Item | Owner |
| --- | --- |
| Stored discount column for sort | future scale work |
| Related-product `position` | pending decision |
| Bundle / image audit | P17-T04 (done — see BUNDLE_IMAGE_AUDIT_P17.md) |
| Live LCP/INP budgets | after production URL (Phase 18) |

## How to re-run

```bash
npm run test:queries
```
